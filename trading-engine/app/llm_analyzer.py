# GPT-4o mini 호출 및 패턴 분석 기능
import json
import os
from typing import Dict, Optional
from openai import AsyncOpenAI
from openai import APIConnectionError, APIStatusError, RateLimitError, AuthenticationError
import logging

# 로깅 설정
logger = logging.getLogger(__name__)

# OpenAI API 클라이언트 설정
_OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = AsyncOpenAI(api_key=_OPENAI_API_KEY)

SYSTEM_PROMPT = """
너는 트레이딩 성과 분석 전문가다.
주어진 이번 주와 지난 주의 거래 집계 데이터를 비교하여 다음을 작성하라:
1. 저번주보다 좋아진 점 (문장 리스트)
2. 이번주에 가장 손실이 컸던 패턴 (이유, 개선방안 포함)
3. 이번주에 가장 수익이 컸던 패턴 (이유, 유지방안 포함)

출력은 반드시 JSON 형식으로 하고, 다음 키를 포함해야 한다:
{
  "improvements": ["string", ...],
  "top_loss_pattern": { "title": "string", "why": "string", "actions": ["string"] },
  "top_profit_pattern": { "title": "string", "why": "string", "actions": ["string"] }
}

- title: 패턴을 직관적으로 이해할 수 있는 간단한 이름
- why: 해당 패턴이 손실/수익을 낸 이유를 데이터 기반으로 설명
- actions: 다음 주에 개선 또는 유지하기 위한 구체적인 행동 리스트
- 주어진 표와 수치에서만 근거를 찾아 작성하며, 추측은 하지 않는다.
"""

def create_user_prompt(analysis_data: Dict[str, str]) -> str:
    """분석 데이터를 바탕으로 User Prompt 생성"""
    return f"""
[이번 주 거래 집계]
전략별 성과:
{analysis_data['this_week_strategy_csv']}

금기 위반율:
{analysis_data['this_week_penalty_csv']}

시간대별 성과:
{analysis_data['this_week_time_csv']}

[지난 주 거래 집계]
전략별 성과:
{analysis_data['last_week_strategy_csv']}

금기 위반율:
{analysis_data['last_week_penalty_csv']}

시간대별 성과:
{analysis_data['last_week_time_csv']}

요청:
위 데이터를 비교 분석하여,
- 이번 주에 저번 주보다 좋아진 점
- 이번 주에 가장 손실이 컸던 패턴
- 이번 주에 가장 수익이 컸던 패턴
을 JSON 형식으로 작성하라.
"""

async def analyze_patterns_with_gpt(analysis_data: Dict[str, str], max_retries: int = 1) -> Optional[Dict]:
    """GPT-4o mini를 사용하여 패턴 분석 수행"""
    user_prompt = create_user_prompt(analysis_data)
    
    for attempt in range(max_retries + 1):
        try:
            logger.info(f"GPT 호출 시도 {attempt + 1}/{max_retries + 1}")
            
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=1500
            )
            
            # 응답 파싱
            content = response.choices[0].message.content.strip()
            logger.info(f"GPT 응답 받음: {len(content)} characters")
            
            # JSON 파싱 검증
            result = json.loads(content)
            
            # 필수 키 검증
            required_keys = ["improvements", "top_loss_pattern", "top_profit_pattern"]
            for key in required_keys:
                if key not in result:
                    raise ValueError(f"필수 키 '{key}'가 응답에 없음")
            
            # 패턴 객체 구조 검증
            for pattern_key in ["top_loss_pattern", "top_profit_pattern"]:
                pattern = result[pattern_key]
                pattern_required = ["title", "why", "actions"]
                for req_key in pattern_required:
                    if req_key not in pattern:
                        raise ValueError(f"패턴 '{pattern_key}'에 필수 키 '{req_key}'가 없음")
            
            logger.info("GPT 응답 검증 완료")
            return result
            
        except (APIConnectionError, APIStatusError, RateLimitError, AuthenticationError) as e:
            error_msg = f"OpenAI API 오류 (시도 {attempt + 1}): {e}"
            logger.error(error_msg)
            
            # 한글 주석: 구체적인 에러 타입별 메시지 추가
            if "insufficient_quota" in str(e).lower():
                logger.error("OpenAI 크레딧 부족. platform.openai.com에서 충전이 필요합니다.")
            elif "rate_limit" in str(e).lower():
                logger.error("API 요청 한도 초과. 잠시 후 다시 시도하세요.")
            elif isinstance(e, AuthenticationError):
                logger.error("OPENAI_API_KEY를 확인하세요.")
                
            if attempt == max_retries:
                logger.error("최대 재시도 횟수 초과. GPT 분석 실패")
                return None
                
        except json.JSONDecodeError as e:
            logger.error(f"JSON 파싱 오류 (시도 {attempt + 1}): {e}")
            logger.error(f"응답 내용: {content if 'content' in locals() else 'N/A'}")
            if attempt == max_retries:
                logger.error("최대 재시도 횟수 초과. GPT 응답 형식 오류")
                return None
                
        except Exception as e:
            logger.error(f"알 수 없는 오류 (시도 {attempt + 1}): {e}")
            if attempt == max_retries:
                logger.error("최대 재시도 횟수 초과. 시스템 오류")
                return None
    
    # 한글 주석: 모든 재시도 실패 시 명확한 실패 로그
    logger.error("GPT 패턴 분석 완전 실패 - 모든 재시도 소진")
    return None

def validate_analysis_result(result: Dict) -> bool:
    """분석 결과 유효성 검증"""
    try:
        # 기본 구조 검증
        if not isinstance(result.get("improvements"), list):
            return False
            
        for pattern_key in ["top_loss_pattern", "top_profit_pattern"]:
            pattern = result.get(pattern_key)
            if not isinstance(pattern, dict):
                return False
                
            if not all(key in pattern for key in ["title", "why", "actions"]):
                return False
                
            if not isinstance(pattern["actions"], list):
                return False
                
        return True
        
    except Exception:
        return False