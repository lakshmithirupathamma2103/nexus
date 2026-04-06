import os
import json
import hashlib
import uuid
import asyncio
import re
from datetime import datetime

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS, cross_origin
from dotenv import load_dotenv
import google.generativeai as genai
from PyPDF2 import PdfReader
from crawl4ai import AsyncWebCrawler

load_dotenv()

app = Flask(__name__, static_folder='frontend', static_url_path='')
CORS(app)

# ── Gemini Setup ──────────────────────────────────────────────
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.0-flash")

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
USERS_FILE = os.path.join(DATA_DIR, 'users.json')
PROFILES_FILE = os.path.join(DATA_DIR, 'profiles.json')
UPLOAD_DIR = os.path.join(DATA_DIR, 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)


# ── Helpers ───────────────────────────────────────────────────
def ask_gemini(prompt, system=""):
    full = f"{system}\n\n{prompt}" if system else prompt
    response = model.generate_content(full)
    return response.text


def ask_gemini_json(prompt, system=""):
    raw = ask_gemini(prompt, system)
    cleaned = re.sub(r'^```(?:json)?\s*', '', raw.strip())
    cleaned = re.sub(r'```\s*$', '', cleaned.strip())
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        retry_prompt = prompt + "\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no explanation, no code fences."
        raw2 = ask_gemini(retry_prompt, system)
        cleaned2 = re.sub(r'^```(?:json)?\s*', '', raw2.strip())
        cleaned2 = re.sub(r'```\s*$', '', cleaned2.strip())
        return json.loads(cleaned2)


def web_search(query):
    async def _crawl():
        url = f"https://www.google.com/search?q={query.replace(' ', '+')}"
        async with AsyncWebCrawler() as crawler:
            result = await crawler.arun(url=url)
            return result.markdown[:3000] if result.markdown else ""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_crawl())
        loop.close()
        return result
    except Exception as e:
        print(f"Web search error: {e}")
        return ""


def load_json(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def hash_password(password):
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


def extract_pdf_text(file_storage):
    reader = PdfReader(file_storage)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text


# ── Serve Frontend ────────────────────────────────────────────
@app.route('/')
@cross_origin()
def serve_frontend():
    return send_from_directory('frontend', 'index.html')


# ══════════════════════════════════════════════════════════════
# AUTH ROUTES
# ══════════════════════════════════════════════════════════════
@app.route('/api/auth/register', methods=['POST'])
@cross_origin()
def register():
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        confirm = data.get('confirm_password', '')

        if not username or not email or not password:
            return jsonify({"error": "All fields are required"}), 400
        if password != confirm:
            return jsonify({"error": "Passwords do not match"}), 400
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400

        users_data = load_json(USERS_FILE)
        if 'users' not in users_data:
            users_data['users'] = []

        for u in users_data['users']:
            if u['username'].lower() == username.lower():
                return jsonify({"error": "Username already exists"}), 400
            if u['email'].lower() == email.lower():
                return jsonify({"error": "Email already registered"}), 400

        user_id = str(uuid.uuid4())[:8]
        new_user = {
            "id": user_id,
            "username": username,
            "email": email,
            "password_hash": hash_password(password),
            "created_at": datetime.utcnow().isoformat()
        }
        users_data['users'].append(new_user)
        save_json(USERS_FILE, users_data)

        return jsonify({"success": True, "user_id": user_id, "username": username})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/auth/login', methods=['POST'])
@cross_origin()
def login():
    try:
        data = request.get_json()
        identifier = data.get('identifier', '').strip()
        password = data.get('password', '')

        if not identifier or not password:
            return jsonify({"error": "All fields are required"}), 400

        users_data = load_json(USERS_FILE)
        pwd_hash = hash_password(password)

        for u in users_data.get('users', []):
            if (u['username'].lower() == identifier.lower() or u['email'].lower() == identifier.lower()):
                if u['password_hash'] == pwd_hash:
                    return jsonify({"success": True, "user_id": u['id'], "username": u['username']})
                else:
                    return jsonify({"error": "Invalid password"}), 401

        return jsonify({"error": "User not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════════════════════════════
# GENERAL AI CHAT
# ══════════════════════════════════════════════════════════════
@app.route('/api/chat', methods=['POST'])
@cross_origin()
def chat():
    try:
        data = request.get_json()
        messages = data.get('messages', [])
        search_enabled = data.get('search', False)

        if not messages:
            return jsonify({"error": "No messages provided"}), 400

        latest_msg = messages[-1].get('content', '')
        search_context = ""
        sources = []

        if search_enabled:
            search_results = web_search(latest_msg)
            if search_results:
                search_context = f"\n\nWeb Search Results:\n{search_results}\n\nUse the above search results to provide an accurate, up-to-date answer. Cite sources when possible."
                sources = [{"title": "Web Search", "url": f"https://www.google.com/search?q={latest_msg.replace(' ', '+')}"}]

        conversation = ""
        for msg in messages:
            role = "User" if msg['role'] == 'user' else "Assistant"
            conversation += f"{role}: {msg['content']}\n"

        system = "You are Nexus, a helpful AI assistant. Be concise, accurate and friendly. Format your responses with markdown when appropriate."
        prompt = f"{conversation}{search_context}\n\nAssistant:"

        reply = ask_gemini(prompt, system)
        return jsonify({"reply": reply, "sources": sources})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════════════════════════════
# SEARCH
# ══════════════════════════════════════════════════════════════
@app.route('/api/search', methods=['POST'])
@cross_origin()
def search():
    try:
        data = request.get_json()
        query = data.get('query', '')
        if not query:
            return jsonify({"error": "No query provided"}), 400

        results = web_search(query)
        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════════════════════════════
# UPLOAD DOCUMENT
# ══════════════════════════════════════════════════════════════
@app.route('/api/upload-doc', methods=['POST'])
@cross_origin()
def upload_doc():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        text = extract_pdf_text(file)
        if not text.strip():
            return jsonify({"error": "Could not extract text from PDF"}), 400

        prompt = f"Summarize this document and list key points:\n\n{text[:8000]}"
        summary = ask_gemini(prompt)

        return jsonify({"summary": summary, "filename": file.filename})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════════════════════════════
# BUSINESS MODE ROUTES
# ══════════════════════════════════════════════════════════════
@app.route('/api/business/chat', methods=['POST'])
@cross_origin()
def business_chat():
    try:
        data = request.get_json()
        messages = data.get('messages', [])
        search_enabled = data.get('search', False)

        if not messages:
            return jsonify({"error": "No messages provided"}), 400

        latest_msg = messages[-1].get('content', '')
        search_context = ""
        sources = []

        if search_enabled:
            search_results = web_search(latest_msg)
            if search_results:
                search_context = f"\n\nWeb Search Results:\n{search_results}\n\nUse these results to provide data-driven insights."
                sources = [{"title": "Web Search", "url": f"https://www.google.com/search?q={latest_msg.replace(' ', '+')}"}]

        conversation = ""
        for msg in messages:
            role = "User" if msg['role'] == 'user' else "Assistant"
            conversation += f"{role}: {msg['content']}\n"

        system = "You are a senior business analyst and strategy consultant. Provide data-driven insights, market analysis, and strategic recommendations. Format responses with markdown."
        prompt = f"{conversation}{search_context}\n\nAssistant:"

        reply = ask_gemini(prompt, system)
        return jsonify({"reply": reply, "sources": sources})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/business/analyse-doc', methods=['POST'])
@cross_origin()
def business_analyse_doc():
    try:
        if 'file' not in request.files:
            # Return mock data when no file uploaded
            mock = {
                "risks": [
                    {"title": "Market Volatility", "severity": "High", "description": "Current market conditions show high volatility that could impact revenue projections.", "score": 8},
                    {"title": "Competitive Pressure", "severity": "Medium", "description": "Increasing competition from established players may erode market share.", "score": 6},
                    {"title": "Regulatory Compliance", "severity": "Low", "description": "Minor regulatory changes expected in the next quarter.", "score": 3}
                ],
                "pros": [
                    "Strong product-market fit with growing demand",
                    "Experienced leadership team with industry expertise",
                    "Scalable technology infrastructure",
                    "High customer retention rate of 92%"
                ],
                "concerns": [
                    "Cash burn rate needs monitoring",
                    "Dependency on single revenue stream",
                    "Technical debt accumulation"
                ],
                "recommendations": [
                    "Diversify revenue streams within next 2 quarters",
                    "Implement cost optimization program",
                    "Accelerate product development roadmap",
                    "Strengthen strategic partnerships"
                ],
                "strategy": {
                    "pmf": 78,
                    "gtm": 65,
                    "team": 82,
                    "finance": 58,
                    "innovation": 71
                }
            }
            return jsonify(mock)

        file = request.files['file']
        text = extract_pdf_text(file)
        if not text.strip():
            return jsonify({"error": "Could not extract text from PDF"}), 400

        prompt = f"""Analyze this business document. Return ONLY valid JSON with no markdown fences:
{{
  "risks": [{{"title": "string", "severity": "High/Medium/Low", "description": "string", "score": 1-10}}],
  "pros": ["string"],
  "concerns": ["string"],
  "recommendations": ["string"],
  "strategy": {{"pmf": 0-100, "gtm": 0-100, "team": 0-100, "finance": 0-100, "innovation": 0-100}}
}}

Document text:
{text[:8000]}"""

        result = ask_gemini_json(prompt)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/business/idea', methods=['POST'])
@cross_origin()
def business_idea():
    try:
        data = request.get_json()
        idea = data.get('idea', '')
        if not idea:
            return jsonify({"error": "No idea provided"}), 400

        prompt = f"""Analyze this business idea and return ONLY valid JSON with no markdown fences:
{{
  "viability": 8.4,
  "tam": "$4.8B",
  "sam": "$1.2B",
  "som": "$15M",
  "growth_rate": "32% CAGR",
  "competitor_count": 24,
  "strengths": ["string1", "string2", "string3"],
  "challenges": ["string1", "string2", "string3"],
  "differentiation": ["string1", "string2", "string3"],
  "next_steps": ["string1", "string2", "string3"]
}}

Business Idea:
{idea}"""

        result = ask_gemini_json(prompt)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/business/competitor', methods=['POST'])
@cross_origin()
def business_competitor():
    try:
        data = request.get_json()
        name = data.get('name', '')
        if not name:
            return jsonify({"error": "No competitor name provided"}), 400

        search_results = web_search(f"{name} company overview market analysis")

        prompt = f"""Based on this information about {name}, return ONLY valid JSON with no markdown fences:
{{
  "name": "{name}",
  "description": "Brief company description",
  "market_share": 0-100,
  "ai_quality": 0-100,
  "ux_score": 0-100,
  "strengths": ["string1", "string2"],
  "weaknesses": ["string1", "string2"],
  "threat_level": "High/Medium/Low/Critical"
}}

Search results:
{search_results}"""

        result = ask_gemini_json(prompt)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════════════════════════════
# STUDY MODE ROUTES
# ══════════════════════════════════════════════════════════════
@app.route('/api/study/setup', methods=['POST'])
@cross_origin()
def study_setup():
    try:
        data = request.get_json()
        user_id = data.get('user_id', '')
        if not user_id:
            return jsonify({"error": "User ID required"}), 400

        profile = {
            "name": data.get('name', ''),
            "class": data.get('class', ''),
            "board": data.get('board', ''),
            "stream": data.get('stream', ''),
            "subjects": data.get('subjects', []),
            "goal": data.get('goal', ''),
            "hours": data.get('hours', 2),
            "level": data.get('level', 'Beginner'),
            "progress": {},
            "created_at": datetime.utcnow().isoformat()
        }

        profiles = load_json(PROFILES_FILE)
        profiles[user_id] = profile
        save_json(PROFILES_FILE, profiles)

        return jsonify({"success": True, "profile": profile})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/study/profile', methods=['GET'])
@cross_origin()
def get_study_profile():
    try:
        user_id = request.args.get('user_id', '')
        if not user_id:
            return jsonify({"error": "User ID required"}), 400

        profiles = load_json(PROFILES_FILE)
        if user_id in profiles:
            return jsonify({"exists": True, "profile": profiles[user_id]})
        return jsonify({"exists": False})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/study/progress', methods=['PUT'])
@cross_origin()
def update_progress():
    try:
        data = request.get_json()
        user_id = data.get('user_id', '')
        subject = data.get('subject', '')
        chapter = data.get('chapter', '')
        completed = data.get('completed', False)

        if not user_id or not subject or not chapter:
            return jsonify({"error": "Missing required fields"}), 400

        profiles = load_json(PROFILES_FILE)
        if user_id not in profiles:
            return jsonify({"error": "Profile not found"}), 404

        if 'progress' not in profiles[user_id]:
            profiles[user_id]['progress'] = {}
        if subject not in profiles[user_id]['progress']:
            profiles[user_id]['progress'][subject] = {}
        profiles[user_id]['progress'][subject][chapter] = completed

        save_json(PROFILES_FILE, profiles)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/study/quiz', methods=['POST'])
@cross_origin()
def study_quiz():
    try:
        data = request.get_json()
        user_id = data.get('user_id', '')
        subject = data.get('subject', '')
        topic = data.get('topic', '')
        count = data.get('count', 5)
        difficulty = data.get('difficulty', 'Medium')

        profiles = load_json(PROFILES_FILE)
        profile = profiles.get(user_id, {})
        student_class = profile.get('class', 'Student')
        board = profile.get('board', '')
        goal = profile.get('goal', '')

        prompt = f"""Generate {count} MCQ questions about {topic} from {subject}
for a {student_class} student on {board} board targeting {goal}.
Difficulty: {difficulty}.
Return ONLY a valid JSON array, no markdown, no explanation:
[
  {{
    "question": "...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "answer": "A",
    "explanation": "..."
  }}
]"""

        questions = ask_gemini_json(prompt)
        if not isinstance(questions, list):
            questions = questions.get('questions', [])
        return jsonify({"questions": questions})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/study/tutor', methods=['POST'])
@cross_origin()
def study_tutor():
    try:
        data = request.get_json()
        messages = data.get('messages', [])
        user_id = data.get('user_id', '')

        profiles = load_json(PROFILES_FILE)
        profile = profiles.get(user_id, {})

        subjects_list = ", ".join([s['name'] for s in profile.get('subjects', [])])
        syllabus_summary = ""
        for s in profile.get('subjects', []):
            if s.get('chapters'):
                syllabus_summary += f"\n{s['name']}: {', '.join(s['chapters'][:5])}"

        system = f"""You are a personal study tutor. Student profile: Name={profile.get('name','Student')}, Class={profile.get('class','')},
Board={profile.get('board','')}, Stream={profile.get('stream','')}, Goal={profile.get('goal','')}, Level={profile.get('level','')}.
Their subjects: {subjects_list}. Their syllabus: {syllabus_summary}.
Explain concepts clearly at their level. For JEE/NEET use exam-focused shortcuts.
Use examples relevant to Indian education system. Format responses with markdown."""

        conversation = ""
        for msg in messages:
            role = "User" if msg['role'] == 'user' else "Assistant"
            conversation += f"{role}: {msg['content']}\n"

        reply = ask_gemini(conversation + "\nAssistant:", system)
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/study/flashcards', methods=['POST'])
@cross_origin()
def study_flashcards():
    try:
        data = request.get_json()
        subject = data.get('subject', '')
        topic = data.get('topic', '')
        count = data.get('count', 10)
        user_id = data.get('user_id', '')

        profiles = load_json(PROFILES_FILE)
        profile = profiles.get(user_id, {})
        student_class = profile.get('class', '')

        prompt = f"""Generate {count} flashcards about {topic} from {subject} for a {student_class} student.
Return ONLY a valid JSON array, no markdown, no explanation:
[
  {{"question": "...", "answer": "..."}}
]"""

        cards = ask_gemini_json(prompt)
        if not isinstance(cards, list):
            cards = cards.get('flashcards', cards.get('cards', []))
        return jsonify({"flashcards": cards})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/study/notes', methods=['POST'])
@cross_origin()
def study_notes():
    try:
        data = request.get_json()
        action = data.get('action', 'transform')
        text = data.get('text', '')
        subject = data.get('subject', '')

        if not text:
            return jsonify({"error": "No text provided"}), 400

        prompts = {
            "transform": f"Transform these raw study notes into well-structured, organized notes with clear headings, bullet points, key formulas highlighted, and exam tips. Subject: {subject}\n\nNotes:\n{text}",
            "summary": f"Create a concise 5-point summary of these notes. Subject: {subject}\n\nNotes:\n{text}",
            "formulas": f"Extract and format all formulas, equations, and key mathematical/scientific expressions from these notes. Present them clearly. Subject: {subject}\n\nNotes:\n{text}",
            "questions": f"Generate 5 potential exam questions based on these notes. Include a mix of short answer and long answer questions. Subject: {subject}\n\nNotes:\n{text}"
        }

        prompt = prompts.get(action, prompts['transform'])
        result = ask_gemini(prompt)
        return jsonify({"result": result, "action": action})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/study/plan', methods=['POST'])
@cross_origin()
def study_plan():
    try:
        data = request.get_json()
        user_id = data.get('user_id', '')

        profiles = load_json(PROFILES_FILE)
        profile = profiles.get(user_id, {})

        subjects_info = ""
        for s in profile.get('subjects', []):
            progress = profile.get('progress', {}).get(s['name'], {})
            total = len(s.get('chapters', []))
            done = sum(1 for v in progress.values() if v)
            subjects_info += f"\n{s['name']}: {done}/{total} chapters done. Chapters: {', '.join(s.get('chapters', []))}"

        prompt = f"""Create a study plan for today for this student:
Name: {profile.get('name','Student')}, Class: {profile.get('class','')}, Goal: {profile.get('goal','')}, Hours available: {profile.get('hours',2)}h
Subjects and progress: {subjects_info}

Return ONLY valid JSON, no markdown:
{{
  "tasks": [
    {{"subject": "...", "topic": "...", "duration": "45 min", "type": "Study/Practice/Review", "priority": "High/Medium/Low"}}
  ],
  "weak_areas": [{{"subject": "...", "topic": "...", "score": 0-100}}]
}}"""

        result = ask_gemini_json(prompt)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════════════════════════════
# RESEARCH MODE ROUTES
# ══════════════════════════════════════════════════════════════
@app.route('/api/research/chat', methods=['POST'])
@cross_origin()
def research_chat():
    try:
        data = request.get_json()
        messages = data.get('messages', [])
        search_enabled = data.get('search', False)

        if not messages:
            return jsonify({"error": "No messages provided"}), 400

        latest_msg = messages[-1].get('content', '')
        search_context = ""
        sources = []

        if search_enabled:
            search_results = web_search(latest_msg)
            if search_results:
                search_context = f"\n\nWeb Search Results:\n{search_results}\n\nUse these results to support your academic analysis. Provide proper citations."
                sources = [{"title": "Academic Search", "url": f"https://scholar.google.com/scholar?q={latest_msg.replace(' ', '+')}"}]

        conversation = ""
        for msg in messages:
            role = "User" if msg['role'] == 'user' else "Assistant"
            conversation += f"{role}: {msg['content']}\n"

        system = "You are an academic research assistant. Provide structured responses with citations in APA format. Be precise and scholarly. Use markdown formatting for structure."
        prompt = f"{conversation}{search_context}\n\nAssistant:"

        reply = ask_gemini(prompt, system)
        return jsonify({"reply": reply, "sources": sources})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════════════════════════════
# PERSONALISATION MODE ROUTES
# ══════════════════════════════════════════════════════════════
@app.route('/api/personal/tool', methods=['POST'])
@cross_origin()
def personal_tool():
    try:
        data = request.get_json()
        tool = data.get('tool', '')

        if tool == 'writing':
            action = data.get('action', 'improve')
            text = data.get('text', '')
            prompts = {
                'improve': f"Improve this writing. Make it more clear, engaging, and professional:\n\n{text}",
                'tone_professional': f"Rewrite this text in a professional tone:\n\n{text}",
                'tone_friendly': f"Rewrite this text in a friendly, conversational tone:\n\n{text}",
                'tone_assertive': f"Rewrite this text in an assertive, confident tone:\n\n{text}",
                'shorten': f"Shorten this text while keeping the key message:\n\n{text}",
                'grammar': f"Fix all grammar, spelling, and punctuation errors in this text. Explain each correction:\n\n{text}"
            }
            result = ask_gemini(prompts.get(action, prompts['improve']))
            return jsonify({"result": result})

        elif tool == 'prd':
            text = data.get('text', '')
            prompt = f"""Generate a detailed prototype plan from this PRD. Include these sections:
1. Overview & Goals
2. User Stories
3. Wireframe Notes (describe the layout)
4. Recommended Tech Stack
5. Implementation Milestones (with timeframes)

PRD:
{text}"""
            result = ask_gemini(prompt)
            return jsonify({"result": result})

        elif tool == 'brainstorm':
            topic = data.get('topic', '')
            prompt = f"""Brainstorm ideas about: {topic}
Return ONLY valid JSON with no markdown fences:
{{
  "core_ideas": ["idea1", "idea2", "idea3", "idea4", "idea5"],
  "connections": ["connection1", "connection2", "connection3"],
  "wild_ideas": ["wild1", "wild2", "wild3"]
}}"""
            result = ask_gemini_json(prompt)
            return jsonify(result)

        elif tool == 'flashcards':
            topic = data.get('topic', '')
            count = data.get('count', 10)
            prompt = f"""Generate {count} flashcards about {topic}.
Return ONLY a valid JSON array:
[{{"question": "...", "answer": "..."}}]"""
            cards = ask_gemini_json(prompt)
            if not isinstance(cards, list):
                cards = cards.get('flashcards', cards.get('cards', []))
            return jsonify({"flashcards": cards})

        elif tool == 'code':
            from_lang = data.get('from_lang', '')
            to_lang = data.get('to_lang', '')
            code = data.get('code', '')
            prompt = f"Convert this {from_lang} code to {to_lang}. Return ONLY the converted code with no explanation:\n\n```{from_lang}\n{code}\n```"
            result = ask_gemini(prompt)
            cleaned = re.sub(r'^```\w*\s*', '', result.strip())
            cleaned = re.sub(r'```\s*$', '', cleaned.strip())
            return jsonify({"result": cleaned})

        elif tool == 'email':
            context = data.get('context', '')
            tone = data.get('tone', 'Professional')
            prompt = f"""Compose an email based on this context. Tone: {tone}
Return the email with a subject line at the top.

Context:
{context}"""
            result = ask_gemini(prompt)
            return jsonify({"result": result})

        elif tool == 'notes':
            text = data.get('text', '')
            action = data.get('action', 'transform')
            prompts = {
                'transform': f"Transform these notes into well-structured, organized notes with clear headings, bullet points, and key highlights:\n\n{text}",
                'summary': f"Create a concise 5-point summary of these notes:\n\n{text}",
                'formulas': f"Extract and format all formulas and key expressions from these notes:\n\n{text}",
                'questions': f"Generate 5 potential questions based on these notes:\n\n{text}"
            }
            result = ask_gemini(prompts.get(action, prompts['transform']))
            return jsonify({"result": result, "action": action})

        elif tool == 'resume':
            text = data.get('text', '')
            prompt = f"""Create a professional resume based on this information. Format it clearly with sections for Contact Info, Summary, Experience, Education, Skills, and Projects.

Information:
{text}"""
            result = ask_gemini(prompt)
            return jsonify({"result": result})

        elif tool == 'social':
            text = data.get('text', '')
            platform = data.get('platform', 'Twitter')
            prompt = f"""Generate social media content for {platform} based on this topic/context:
{text}

Include relevant hashtags and make it engaging."""
            result = ask_gemini(prompt)
            return jsonify({"result": result})

        elif tool == 'image_prompt':
            text = data.get('text', '')
            prompt = f"""Generate 5 detailed, creative image generation prompts based on this concept:
{text}

Each prompt should be detailed enough for an AI image generator. Include style, lighting, composition details."""
            result = ask_gemini(prompt)
            return jsonify({"result": result})

        elif tool == 'todo':
            text = data.get('text', '')
            action = data.get('action', 'organize')
            prompts = {
                'organize': f"Organize these tasks by priority and category. Add time estimates:\n\n{text}",
                'breakdown': f"Break down this complex task into smaller, actionable sub-tasks:\n\n{text}",
                'schedule': f"Create a daily schedule for these tasks:\n\n{text}"
            }
            result = ask_gemini(prompts.get(action, prompts['organize']))
            return jsonify({"result": result})

        elif tool == 'pylingo':
            text = data.get('text', '')
            action = data.get('action', 'explain')
            prompts = {
                'explain': f"Explain this Python code in simple terms, line by line:\n\n```python\n{text}\n```",
                'optimize': f"Optimize this Python code for better performance and readability:\n\n```python\n{text}\n```",
                'debug': f"Find and fix bugs in this Python code:\n\n```python\n{text}\n```",
                'document': f"Add comprehensive docstrings and comments to this Python code:\n\n```python\n{text}\n```"
            }
            result = ask_gemini(prompts.get(action, prompts['explain']))
            return jsonify({"result": result})

        else:
            return jsonify({"error": f"Unknown tool: {tool}"}), 400

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════════════════════════════
# RUN
# ══════════════════════════════════════════════════════════════
if __name__ == '__main__':
    print("\n+==========================================+")
    print("|       NEXUS AI Platform v2.0             |")
    print("|       http://localhost:5000               |")
    print("+==========================================+\n")
    app.run(debug=True, port=5000)
