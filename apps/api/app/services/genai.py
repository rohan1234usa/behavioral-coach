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

    async def generate_questions_stream(self, company: str, role: str, resume_text: str = ""):
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
            # We use stream=True and generator pattern
            response = self.model.generate_content(prompt, stream=True)
            for chunk in response:
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

genai_service = GenAIService()
