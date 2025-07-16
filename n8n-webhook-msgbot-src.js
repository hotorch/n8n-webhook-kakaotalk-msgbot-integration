/**
 * 카카오톡 메신저봇 - n8n 웹훅 연동 시스템 (Ver 3.0)
 * 메신저봇R API2 / ES5 문법
 * 작성자: 샘호트만 렛츠고
 * 작성일: 2025-01-15
 * 수정일: 2025-01-15
 * 
 * [Ver 3.0 변경사항]
 * - jsoup 웹훅 전송 방식 유지 (데이터 전송 안정성)
 * - 향상된 응답 처리 로직 적용
 * - JSON 파싱 및 에러 핸들링 개선
 */

// ===== 1. Bot 인스턴스 (최우선!) =====
var bot = BotManager.getCurrentBot();

// ===== 2. 설정 =====
var CONFIG = {
    BOT_NAME: "n8n 웹훅 연동봇 v3.1",
    VERSION: "3.1.0",
    WEBHOOK_URL: "http://your-n8n-server:5678/webhook/n8n-kakaotalk-from-msg", // 실제 사용시 본인의 n8n 서버 주소로 변경
    TARGET_ROOMS: ["테스트방1","테스트방2","테스트방3"], // 실제 사용할 카카오톡 방 이름으로 변경
    CALL_KEYWORD: "?봇", // 봇이 반응할 키워드
    BUTLER_LIST: ['관리자1', '관리자2'], // 봇을 사용할 수 있는 사용자 목록
    TIMEOUT: 45000,  // 45초로 조정
    DEBUG_MODE: true
};

// ===== 3. 유틸리티 객체 =====
var Log = {
    bot: bot,
    
    info: function(message) {
        var timestamp = new Date().toLocaleString();
        var logMsg = "[INFO] " + timestamp + " - " + message;
        java.lang.System.out.println(logMsg);
    },
    
    error: function(message, error) {
        var timestamp = new Date().toLocaleString();
        var logMsg = "[ERROR] " + timestamp + " - " + message;
        java.lang.System.out.println(logMsg);
        
        if (error) {
            java.lang.System.out.println("[ERROR] Stack: " + (error.stack || error.message || error));
        }
    },
    
    debug: function(message) {
        if (CONFIG.DEBUG_MODE) {
            var timestamp = new Date().toLocaleString();
            java.lang.System.out.println("[DEBUG] " + timestamp + " - " + message);
        }
    }
};

// 집사 확인 함수 (default-bokja.js와 동일한 로직)
function isButler(userName) {
    if (!userName) return false;
    
    // 정확한 매칭 확인
    for (var i = 0; i < CONFIG.BUTLER_LIST.length; i++) {
        if (userName === CONFIG.BUTLER_LIST[i]) {
            return true;
        }
    }
    
    // 특정 문자열 포함 여부 확인 (필요시 수정)
    if (userName.indexOf('관리자') !== -1) {
        return true;
    }
    
    return false;
}



var Utils = {
    // 문자열이 비어있는지 확인 (최종 수정)
    isEmpty: function(str) {
        // str이 null이거나 undefined인 경우를 먼저 처리
        if (str === null || str === undefined) return true;
        // 이제 str은 확실한 JavaScript String이므로 .trim() 사용 가능
        return String(str).trim().length === 0;
    },
    
    // 배열에 요소가 포함되어 있는지 확인
    contains: function(array, item) {
        return array.indexOf(item) !== -1;
    },
    
    // 안전한 JSON 생성
    safeStringify: function(obj) {
        try {
            return JSON.stringify(obj);
        } catch (e) {
            Log.error("JSON 생성 오류", e);
            return "{}";
        }
    }
};

// ===== 4. 메시지 필터링 모듈 =====
var MessageFilter = {
    // 허용된 방인지 확인
    isValidRoom: function(room) {
        return Utils.contains(CONFIG.TARGET_ROOMS, room);
    },
    
    // 키워드로 시작하는지 확인
    hasKeyword: function(content) {
        return content.indexOf(CONFIG.CALL_KEYWORD) === 0;
    },
    
    // 관리자인지 확인
    isButler: function(authorName) {
        return Utils.contains(CONFIG.BUTLER_LIST, authorName);
    },
    
    // 처리해야 할 메시지인지 종합 판단
    shouldProcess: function(msg) {
        if (!msg || !msg.room || !msg.content) {
            return false;
        }
        
        var validRoom = this.isValidRoom(msg.room);
        var hasKeyword = this.hasKeyword(msg.content);
        var isButlerUser = isButler(msg.author.name); // 집사 확인 추가
        
        Log.debug("필터링 체크 - 방: " + msg.room + 
                 " (유효: " + validRoom + "), 키워드: " + hasKeyword + 
                 ", 발신자: " + msg.author.name + " (집사: " + isButlerUser + ")");
        
        return validRoom && hasKeyword && isButlerUser; // 집사 조건 추가
    }
};

// ===== 5. 웹훅 클라이언트 (최종 수정: .execute() 사용) =====
var WebhookClient = {
    send: function(data, callback) {
        Log.info("웹훅 호출 시작: " + CONFIG.WEBHOOK_URL);
        
        var jsonString = Utils.safeStringify(data);
        Log.debug("전송 데이터: " + jsonString);
        
        try {
            // ★★★★★ 핵심 수정 ★★★★★
            // .post()는 HTML로 파싱하므로, 순수 텍스트 응답을 받기 위해 .execute()를 사용합니다.
            var response = org.jsoup.Jsoup.connect(CONFIG.WEBHOOK_URL)
                .header("Content-Type", "application/json")
                .requestBody(jsonString)
                .ignoreContentType(true)
                .ignoreHttpErrors(true)
                .timeout(CONFIG.TIMEOUT)
                .method(org.jsoup.Connection.Method.POST) // .execute()를 위해 메소드를 명시
                .execute(); // .post() 대신 .execute() 호출
            // ★★★★★★★★★★★★★★★★★
            
            var statusCode = response.statusCode();
            Log.info("웹훅 응답 수신 - 상태코드: " + statusCode);
            
            if (statusCode >= 200 && statusCode < 300) {
                Log.debug("응답 성공, 콜백 호출");
                callback(null, response);
            } else {
                var error = new Error("HTTP Error: " + statusCode);
                error.statusCode = statusCode;
                callback(error, response);
            }
            
        } catch (error) {
            Log.error("웹훅 호출 오류: " + error.message, error);
            callback(error, null);
        }
    }
};

// ===== 6. 에러 처리 모듈 =====
var ErrorHandler = {
    getErrorMessage: function(error, response) {
        // 네트워크 타임아웃
        if (error && error.message && error.message.indexOf("timeout") !== -1) {
            return "⏰ 응답 시간 초과: 요청이 너무 복잡하거나 서버가 바쁩니다";
        }
        
        // 네트워크 연결 오류
        if (error && error.message && 
            (error.message.indexOf("connect") !== -1 || 
             error.message.indexOf("host") !== -1)) {
            return "🌐 네트워크 연결 오류: 인터넷 연결을 확인해주세요";
        }
        
        // HTTP 응답이 있는 경우
        if (response) {
            var statusCode = response.statusCode();
            
            // n8n 서버 오류 (5xx)
            if (statusCode >= 500) {
                return "🚨 n8n 서버 오류 (" + statusCode + "): 잠시 후 다시 시도해주세요";
            }
            
            // n8n 클라이언트 오류 (4xx)
            if (statusCode >= 400) {
                return "❌ 요청 오류 (" + statusCode + "): 메시지 형식을 확인해주세요";
            }
        }
        
        // 일반적인 메신저봇 내부 오류
        return "🔧 메신저봇 오류: 개발자에게 문의하세요";
    }
};

// ===== 7. 메인 메시지 처리 (향상된 응답 처리) =====
var MessageProcessor = {
    bot: bot,
    
    process: function(msg) {
        // 1. 로깅
        Log.info("메시지 수신 - 방: " + msg.room + 
                ", 발신자: " + msg.author.name + 
                ", 내용: " + msg.content);
        
        // 2. 필터링
        if (!MessageFilter.shouldProcess(msg)) {
            Log.debug("필터링 통과 실패 - 처리하지 않음");
            return;
        }
        
        // 3. 웹훅 데이터 구성
        var webhookData = {
            msg: msg.content,
            room: msg.room,
            sender: msg.author.name
        };
        
        // 4. 웹훅 호출
        WebhookClient.send(webhookData, function(error, response) {
            if (error) {
                var errorMsg = ErrorHandler.getErrorMessage(error, response);
                Log.error("웹훅 처리 실패: " + errorMsg);
                msg.reply(errorMsg);
                return;
            }
            
            if (!response) {
                Log.error("응답 객체 없음");
                msg.reply("🔧 메신저봇 오류: 응답을 받지 못했습니다");
                return;
            }
            
            try {
                // 1. .execute()로 받은 응답의 body는 순수 텍스트입니다.
                //    Java String을 JavaScript String으로 안전하게 변환합니다.
                var rawResponse = String(response.body());

                Log.debug("응답 원본 (순수 텍스트): " + rawResponse);

                if (Utils.isEmpty(rawResponse)) {
                    Log.error("n8n에서 빈 응답 수신");
                    msg.reply("🤔 n8n에서 빈 응답을 받았습니다");
                    return;
                }

                var answer = rawResponse;

                // 2. n8n 응답이 JSON 형태인지 확인하고 response_text 추출
                //    이제 charAt, trim, replace 모두 정상 동작합니다.
                if (answer.trim().charAt(0) === '[') {
                    try {
                        var jsonResponse = JSON.parse(answer);
                        Log.debug("JSON 배열 파싱 성공");

                        if (jsonResponse.length > 0 && jsonResponse[0] && jsonResponse[0].response_text) {
                            answer = jsonResponse[0].response_text;
                            Log.debug("response_text 추출 성공");
                        }
                    } catch (jsonError) {
                        Log.error("JSON 파싱 실패, 원본 텍스트 사용: " + jsonError.message);
                    }
                }

                // 3. 카카오톡 포맷팅 적용 (보이지 않는 문자 + trim)
                //    가장 단순하고 올바른 형태로 되돌립니다.
                var invisibleChar = "\u200b";
                answer = invisibleChar + String(answer).trim();

                Log.info("최종 전송 메시지 미리보기: " + answer.substring(0, 100) + "...");
                
                // 최종 응답 전송
                msg.reply(answer);

            } catch (parseError) {
                Log.error("응답 처리 최상위 오류: " + parseError.message, parseError);
                msg.reply("🔧 응답 처리 중 오류가 발생했습니다: " + parseError.message);
            }
        });
    }
};

// ===== 8. 이벤트 핸들러 =====
function onMessage(msg) {
    try {
        MessageProcessor.process(msg);
    } catch (e) {
        Log.error("onMessage 최상위 오류: " + e.message, e);
        
        // 최후의 안전장치
        if (msg && typeof msg.reply === 'function') {
            msg.reply("🚨 시스템 오류가 발생했습니다. 개발자에게 문의하세요.");
        }
    }
}

function onStartCompile() {
    Log.info("===== " + CONFIG.BOT_NAME + " 컴파일 시작 =====");
    Log.info("버전: " + CONFIG.VERSION);
    Log.info("웹훅 URL: " + CONFIG.WEBHOOK_URL);
    Log.info("대상 방: " + CONFIG.TARGET_ROOMS.join(", "));
    Log.info("호출 키워드: " + CONFIG.CALL_KEYWORD);
    Log.info("관리자: " + CONFIG.BUTLER_LIST.join(", "));
    Log.info("타임아웃: " + CONFIG.TIMEOUT + "ms");
    Log.info("=====================================");
}

function onStop() {
    Log.info(CONFIG.BOT_NAME + " 종료됨");
}

// ===== 9. 이벤트 리스너 등록 (마지막!) =====
bot.addListener(Event.MESSAGE, onMessage);
bot.addListener(Event.START_COMPILE, onStartCompile);
bot.addListener(Event.ACTIVITY_STOP, onStop);

// ===== 10. 초기화 완료 =====
Log.info("✅ " + CONFIG.BOT_NAME + " 로드 완료!");
Log.info("🎯 대상 방: " + CONFIG.TARGET_ROOMS.length + "개");
Log.info("🔑 호출 키워드: " + CONFIG.CALL_KEYWORD);
Log.info("🚀 n8n 웹훅 연동 준비 완료!");
