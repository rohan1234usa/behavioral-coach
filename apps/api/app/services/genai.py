import os
import google.generativeai as genai
from typing import List
import json
import time
from google.api_core import exceptions

class GenAIService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set")
        genai.configure(api_key=api_key)
        # User confirmed visibility of 'Gemini 2.5 Flash' in billing dashboard
        # Switching back to this model as requested.
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def _get_fallback_questions(self, company: str) -> List[str]:
        """
        Returns high-quality simulated questions when the API is down/rate-limited.
        """
        print(f"⚠️ Using Smart Fallback for: {company}")
        company_lower = company.lower()
        
        if "google" in company_lower:
            return [
                "Tell me about a time you had to deal with ambiguity in a project requirement.",
                "Describe a technical decision you made that had a significant trade-off. How did you weigh the options?",
                "How do you ensure your code is scalable and maintainable for a large team?"
            ]
        elif "amazon" in company_lower or "aws" in company_lower:
            return [
                "Tell me about a time you demonstrated Customer Obsession.",
                "Describe a situation where you had to dive deep to find the root cause of an issue.",
                "Tell me about a time you disagreed with a manager but committed to the plan."
            ]
        elif "meta" in company_lower or "facebook" in company_lower:
            return [
                "Tell me about a time you moved fast and broke things (or fixed them).",
                "Describe a conflict you resolved specifically to unblock a team member.",
                "How do you prioritize features when you have conflicting data?"
            ]
        elif "netflix" in company_lower:
            return [
                    "Tell me about a time you prioritized context over control.",
                    "Describe a project where you had to act with complete autonomy.",
                    "How would you handle a situation where a peer is not performing up to the 'dream team' standard?"
            ]

        # Default Generic but High-Quality Fallback
        return [
            f"Tell me about a time you handled a difficult challenge while working at a previous role.",
            f"Why do you specifically want to contribute to the mission at {company}?",
            "Describe a situation where you had to disagree with a team member to achieve a better technical outcome."
        ]

    def generate_questions(self, company: str, role: str, resume_text: str = "") -> List[str]:
        """
        Generates 3 tailored behavioral interview questions.
        """
        prompt = f"""
        You are an expert technical interviewer. 
        Generate 3 challenging behavioral interview questions for a candidate applying to:
        
        Company: {company}
        Role: {role}
        """
        
        if resume_text:
            prompt += f"\n\nCANDIDATE RESUME CONTEXT:\n{resume_text[:4000]}\n\n"
            
        prompt += """
        
        TASK:
        Generate 3 highly specific, challenging behavioral interview questions based on the candidate's resume and the target role.
        
        RULES:
        1.  **Keep questions CONCISE (max 2 sentences).** Do not ramble.
        2.  Reference specific projects/tech from the resume (e.g. "In your Imentiv project...").
        3.  Focus on "How" and "Why" behavioral traits (Conflict, Trade-offs, Leadership).
        4.  Direct and punchy tone, like a senior FAANG interviewer.
        5.  The 3 questions MUST be highly distinct and cover different behavioral traits. Do not ask 3 variations of the same underlying topic.
        6.  Return ONLY the 3 questions separated by a `|||` delimiter. No numbering, no newlines between items, no JSON.
        
        Example Output Format:
        Tell me about a time you handled ambiguity.|||Describe a technical trade-off you made.|||How do you resolve conflicts with teammates?
        """

        max_retries = 3
        for attempt in range(max_retries):
            try:
                # DEBUG PRINT
                print(f"DEBUG: Generating questions for {company} - {role} (Attempt {attempt+1})")
                
                response = self.model.generate_content(prompt)
                
                try: 
                   text_response = response.text.strip()
                except ValueError:
                   print(f"⚠️ Safety Block Triggered: {response.prompt_feedback}")
                   return self._get_fallback_questions(company)

                # Cleanup if the model adds markdown code blocks
                if text_response.startswith("```json"):
                    text_response = text_response[7:-3]
                elif text_response.startswith("```"):
                    text_response = text_response[3:-3]
                    
                questions = json.loads(text_response)
                
                # Ensure we only return strings
                return [str(q) for q in questions if isinstance(q, str)]
                
            except exceptions.ResourceExhausted:
                if attempt < max_retries - 1:
                    print(f"⚠️ Quota exceeded. Retrying in 5 seconds...")
                    time.sleep(5)
                    continue
                else:
                    return self._get_fallback_questions(company)
            
            except Exception as e:
                print(f"❌ GenAI Critical Error: {e}")
                return self._get_fallback_questions(company)
        
        return self._get_fallback_questions(company)

    async def generate_questions_stream(self, company: str, role: str, resume_text: str = "", focus_area: str = ""):
        """
        Generates 3 tailored behavioral interview questions, yielding chunks for a streaming response.
        """
        prompt = f"""
        You are an expert technical interviewer. 
        Generate 3 challenging behavioral interview questions for a candidate applying to:
        
        Company: {company}
        Role: {role}
        """
        
        if resume_text:
            prompt += f"\n\nCANDIDATE RESUME CONTEXT:\n{resume_text[:4000]}\n\n"
            
        if focus_area:
            prompt += f"""
        COACHING FOCUS AREA:
        The candidate has an identified weakness in: "{focus_area}".
        You MUST ensure that at least one (if not more) of your questions directly tests this weakness to help them practice it.
        """
            
        prompt += """
        
        TASK:
        Generate 3 highly specific, challenging behavioral interview questions based on the candidate's resume and the target role.
        
        RULES:
        1.  **Keep questions CONCISE (max 2 sentences).** Do not ramble.
        2.  Reference specific projects/tech from the resume (e.g. "In your Imentiv project...").
        3.  Focus on "How" and "Why" behavioral traits (Conflict, Trade-offs, Leadership).
        4.  Direct and punchy tone, like a senior FAANG interviewer.
        5.  The 3 questions MUST be highly distinct and cover different behavioral traits. Do not ask 3 variations of the same underlying topic.
        6.  Return ONLY the 3 questions separated by a `|||` delimiter. No numbering, no JSON.
        
        Example Output Format:
        Tell me about a time you handled ambiguity.|||Describe a technical trade-off you made.|||How do you resolve conflicts with teammates?
        """

        print(f"DEBUG: Generating streaming questions for {company} - {role}")
        
        try:
            # We use stream=True and async generator pattern
            response = await self.model.generate_content_async(prompt, stream=True)
            async for chunk in response:
                if chunk.text:
                    yield chunk.text
        except exceptions.ResourceExhausted:
            print(f"⚠️ Quota exceeded during stream.")
            fallback = self._get_fallback_questions(company)
            yield "|||".join(fallback)
        except ValueError as e:
            print(f"⚠️ Safety Block Triggered in stream: {e}")
            fallback = self._get_fallback_questions(company)
            yield "|||".join(fallback)
        except Exception as e:
            print(f"❌ GenAI Critical Error in stream: {e}")
            fallback = self._get_fallback_questions(company)
            yield "|||".join(fallback)

    def generate_coaching_plan(self, role: str, company: str, session_data: str) -> dict:
        """
        Analyzes past interview sessions and generates a personalized coaching plan and industry benchmark.
        """
        prompt = f"""
        You are an expert {company} technical recruiter and executive behavioral coach.
        You are analyzing a candidate applying for the role of: {role} at {company}
        
        Below is a summary of their recent mock interview sessions, including their quantitative scores, AI feedback, and transcripts:
        
        {session_data}
        
        TASK:
        1. Compare their performance to the standard industry benchmark for a {role} at {company}. Explain how they stack up. IMPORTANT: Frame this supportively and constructively. Treat 1 or 2 anomalous bad performances as outliers, not the rule. Look for their true potential and average baseline. Phrase critiques as "Growth Opportunities" to encourage and motivate them. Do not be overly critical.
        2. Identify their single biggest "Core Growth Opportunity" across these sessions (Must be concisely 1-5 words max, e.g., "Clarity of Communication" or "Rambling under pressure"). Do not include headings or extra text.
        3. Develop a 3-step actionable markdown plan to remediate this weakness. Ensure the tone of the plan is motivating, empowering, and focused on building confidence.
        
        Return ONLY a JSON object with exactly these three keys:
        - "industry_benchmark_notes" (string, supportive overview of benchmark)
        - "core_weakness" (string, 1-5 words max describing the growth opportunity)
        - "action_plan" (string, formatted with markdown bullet points or steps)
        """
        
        print(f"DEBUG: Generating coaching plan for {role}")
        
        try:
            response = self.model.generate_content(prompt)
            text_response = response.text.strip()
            
            # Cleanup if the model adds markdown code blocks
            if text_response.startswith("```json"):
                text_response = text_response[7:-3]
            elif text_response.startswith("```"):
                text_response = text_response[3:-3]
                
            return json.loads(text_response)
        except Exception as e:
            print(f"❌ GenAI Critical Error generating coaching plan: {e}")
            return {
                "industry_benchmark_notes": "Unable to generate benchmark at this time due to an AI service error.",
                "core_weakness": "Needs Practice",
                "action_plan": "1. Keep practicing questions in the Arena.\n2. Review your session transcripts.\n3. Focus on STAR method delivery."
            }

genai_service = GenAIService()
