/**
 * 카카오톡 메신저봇 - n8n 웹훅 연동 시스템 (Ver 1.0)
 * 메신저봇R API2 / ES5 문법
 * 작성자: 샘호트만 렛츠고
 * 작성일: 2025-07-15
 * 수정일: 2025-07-16


// ===== 1. Bot 인스턴스 (최우선!) =====
var bot = BotManager.getCurrentBot();

// ===== 2. 설정 =====
var CONFIG = {
    BOT_NAME: "n8n 웹훅 연동봇 v3.0",
    VERSION: "3.0.0",
    WEBHOOK_URL: "http://**.***.**.***:5678/webhook-test/n8n-kakaotalk-from-msg", // 웹훅 경로를 뜻함 (테스트할 때 에는 webhook-test, 워크플로우 활성화 하고 나서는 webhook 주소로 메신저봇 경로 또한 변경할 것
    TARGET_ROOMS: ["카톡방1","카톡방2","카톡방3",...], // 어느 카톡방에만 워킹할 것인지 정의하기. 메신저봇과 연동한 카카오톡 계정에서의 카톡방 이름과 같아야함
    CALL_KEYWORD: "봇이 반응할 키워드 삽입", // 봇이 반응할 키워드 삽입
    BUTLER_LIST: ['샘호트만 @ai.sam_hottman'], // 카톡 이름만 반응할 수 있게 세팅. 다른 사람은 못 쓰고 본인만 쓸 수 있다는 뜻
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

var Utils = {
    // 문자열이 비어있는지 확인
    isEmpty: function(str) {
        return !str || str.trim().length === 0;
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
        
        Log.debug("필터링 체크 - 방: " + msg.room + 
                 " (유효: " + validRoom + "), 키워드: " + hasKeyword);
        
        return validRoom && hasKeyword;
    }
};

// ===== 5. 웹훅 클라이언트 (jsoup 방식 - 안정성 강화) =====
var WebhookClient = {
    send: function(data, callback) {
        Log.info("웹훅 호출 시작: " + CONFIG.WEBHOOK_URL);
        
        var jsonString = Utils.safeStringify(data);
        Log.debug("전송 데이터: " + jsonString);
        
        try {
            // jsoup을 사용한 HTTP POST 요청 (데이터 전송 안정성 확보)
            var response = org.jsoup.Jsoup.connect(CONFIG.WEBHOOK_URL)
                .header("Content-Type", "application/json")
                .requestBody(jsonString)
                .ignoreContentType(true)
                .ignoreHttpErrors(true)
                .timeout(CONFIG.TIMEOUT)
                .post();
            
            Log.debug("응답 받음, 상태코드 확인 시도");
            
            var statusCode;
            try {
                statusCode = response.statusCode();
                Log.info("웹훅 응답 수신 - 상태코드: " + statusCode);
            } catch (statusError) {
                Log.error("상태코드 확인 오류: " + statusError.message);
                // 상태코드를 확인할 수 없어도 응답이 있으면 처리 시도
                Log.info("상태코드 불명이지만 응답 처리 시도");
                callback(null, response);
                return;
            }
            
            // 상태코드가 확인 가능한 경우에만 체크
            if (statusCode && (statusCode < 200 || statusCode >= 300)) {
                var error = new Error("HTTP Error: " + statusCode);
                error.statusCode = statusCode;
                callback(error, response);
            } else {
                Log.debug("응답 성공, 콜백 호출");
                callback(null, response);
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
            
            // 5. 성공 응답 처리 (메신저봇 호환성 개선)
            try {
                Log.debug("응답 객체 타입 확인: " + typeof response);
                
                // 안전한 메서드 확인
                try {
                    if (response && typeof response === 'object') {
                        Log.debug("응답 객체가 유효함");
                    }
                } catch (debugError) {
                    Log.debug("응답 객체 디버깅 중 오류: " + debugError.message);
                }
                
                var rawResponse;
                
                // jsoup Document에서 텍스트 추출 시도 (단계별 안전한 방법)
                Log.debug("텍스트 추출 시작");
                
                if (!response) {
                    Log.error("응답 객체가 null");
                    msg.reply("🔧 응답 객체가 없습니다");
                    return;
                }
                
                try {
                    // 방법 1: text() 메서드 (가장 일반적)
                    if (typeof response.text === 'function') {
                        rawResponse = response.text();
                        Log.debug("text() 메서드 성공, 길이: " + rawResponse.length);
                    } else {
                        throw new Error("text() 메서드 없음");
                    }
                } catch (textError) {
                    Log.debug("text() 메서드 실패: " + textError.message);
                    
                    try {
                        // 방법 2: body().text() 메서드
                        if (response.body && typeof response.body === 'function') {
                            var bodyElement = response.body();
                            if (bodyElement && typeof bodyElement.text === 'function') {
                                rawResponse = bodyElement.text();
                                Log.debug("body().text() 메서드 성공, 길이: " + rawResponse.length);
                            } else {
                                throw new Error("body().text() 메서드 없음");
                            }
                        } else {
                            throw new Error("body() 메서드 없음");
                        }
                    } catch (bodyError) {
                        Log.debug("body().text() 메서드 실패: " + bodyError.message);
                        
                        try {
                            // 방법 3: toString() 메서드 (최후 수단)
                            rawResponse = String(response);
                            Log.debug("toString() 변환 성공, 길이: " + rawResponse.length);
                        } catch (toStringError) {
                            Log.error("모든 텍스트 추출 방법 실패");
                            msg.reply("🔧 응답 텍스트 추출 실패: " + toStringError.message);
                            return;
                        }
                    }
                }
                
                Log.debug("응답 원본: " + rawResponse);
                
                // 빈 응답 체크
                if (Utils.isEmpty(rawResponse)) {
                    Log.error("n8n에서 빈 응답 수신");
                    msg.reply("🤔 n8n에서 빈 응답을 받았습니다");
                    return;
                }
                
                var answer = rawResponse;
                
                // n8n이 JSON 형태로 응답하는 경우 처리
                if (rawResponse.charAt(0) === '{' || rawResponse.charAt(0) === '[') {
                    try {
                        var jsonResponse = JSON.parse(rawResponse);
                        Log.debug("JSON 파싱 성공: " + Utils.safeStringify(jsonResponse));
                        
                        // 배열 형태: [{"response_text": "..."}]
                        if (jsonResponse instanceof Array && 
                            jsonResponse.length > 0 && 
                            jsonResponse[0] && 
                            jsonResponse[0].response_text) {
                            answer = jsonResponse[0].response_text;
                            Log.debug("JSON 배열 파싱 성공, response_text 추출: " + answer);
                        }
                        // 객체 형태: {"response_text": "..."}
                        else if (jsonResponse.response_text) {
                            answer = jsonResponse.response_text;
                            Log.debug("JSON 객체 파싱 성공, response_text 추출: " + answer);
                        }
                        // 다른 JSON 형태는 원본 텍스트 사용
                        else {
                            Log.debug("JSON 파싱되었지만 response_text 없음, 원본 텍스트 사용");
                        }
                    } catch (jsonError) {
                        Log.error("JSON 파싱 실패, 원본 텍스트 사용: " + jsonError.message);
                        // 파싱 실패 시 원본 텍스트 그대로 사용
                    }
                }
                
                // 최종 응답이 비어있는지 확인
                if (Utils.isEmpty(answer)) {
                    Log.error("파싱 후에도 빈 응답");
                    msg.reply("🤔 n8n 응답을 처리했지만 내용이 없습니다");
                    return;
                }
                
                Log.info("n8n 응답 성공: " + answer.substring(0, 100) + 
                        (answer.length > 100 ? "..." : ""));
                
                // 응답 전송
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
