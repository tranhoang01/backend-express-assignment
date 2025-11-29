const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// =======================
//  공통 Middleware
// =======================

// JSON body 파싱
app.use(express.json());

// 요청 로그 Middleware (과제 요구: 미들웨어 구현 예시)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`
    );
  });
  next();
});

// =======================
//  In-memory 데이터 (DB 대신 사용)
// =======================
let tasks = [
  { id: 1, title: "첫 번째 할 일", completed: false },
  { id: 2, title: "두 번째 할 일", completed: true },
];
let nextId = 3;

// 공통 응답 포맷 함수
function successResponse(res, statusCode, data, message = "") {
  return res.status(statusCode).json({
    status: "success",
    data,
    message,
  });
}

function errorResponse(res, statusCode, message, data = null) {
  return res.status(statusCode).json({
    status: "error",
    data,
    message,
  });
}

// =======================
//  POST APIs (2개)
// =======================

/**
 * POST /api/tasks
 * 새 Task 생성
 * - Body: { "title": "..." }
 * - 성공: 201 Created
 * - 실패(누락): 400 Bad Request
 */
app.post("/api/tasks", (req, res) => {
  const { title } = req.body;

  if (!title || typeof title !== "string") {
    return errorResponse(res, 400, "title 필드는 필수입니다.");
  }

  const newTask = {
    id: nextId++,
    title,
    completed: false,
  };
  tasks.push(newTask);

  return successResponse(res, 201, newTask, "새 할 일이 생성되었습니다.");
});

/**
 * POST /api/tasks/seed
 * 예제 Task들을 초기화 (리셋)
 * - 성공: 201 Created
 */
app.post("/api/tasks/seed", (req, res) => {
  tasks = [
    { id: 1, title: "샘플 할 일 1", completed: false },
    { id: 2, title: "샘플 할 일 2", completed: false },
  ];
  nextId = 3;

  return successResponse(res, 201, tasks, "샘플 데이터로 초기화되었습니다.");
});

// =======================
//  GET APIs (2개 + 5xx 테스트용 2개)
// =======================

/**
 * GET /api/tasks
 * 모든 Task 목록 조회
 * - 성공: 200 OK
 */
app.get("/api/tasks", (req, res) => {
  return successResponse(res, 200, tasks, "할 일 목록입니다.");
});

/**
 * GET /api/tasks/:id
 * 특정 Task 상세 조회
 * - 성공: 200 OK
 * - 실패: 404 Not Found
 */
app.get("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return errorResponse(res, 404, "해당 ID의 할 일을 찾을 수 없습니다.");
  }

  return successResponse(res, 200, task, "할 일 상세 정보입니다.");
});

/**
 * GET /api/debug/error
 * 강제 서버 에러(500) 발생 테스트용
 * - 항상 500 Internal Server Error
 */
app.get("/api/debug/error", (req, res, next) => {
  const err = new Error("강제로 발생시킨 서버 에러입니다.");
  err.statusCode = 500;
  next(err);
});

/**
 * GET /api/debug/maintenance
 * 503 Service Unavailable 예시
 */
app.get("/api/debug/maintenance", (req, res) => {
  return errorResponse(
    res,
    503,
    "현재 서버 점검 중입니다. 나중에 다시 시도해주세요."
  );
});

// =======================
//  PUT APIs (2개)
// =======================

/**
 * PUT /api/tasks/:id
 * Task 전체 수정 (title, completed)
 * - Body: { "title": "...", "completed": true/false }
 * - 성공: 200 OK
 * - 실패: 404 Not Found
 */
app.put("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const { title, completed } = req.body;

  const taskIndex = tasks.findIndex((t) => t.id === id);
  if (taskIndex === -1) {
    return errorResponse(res, 404, "해당 ID의 할 일을 찾을 수 없습니다.");
  }

  // 간단한 validation
  if (typeof title !== "string" || typeof completed !== "boolean") {
    return errorResponse(
      res,
      400,
      "title은 문자열, completed는 boolean 타입이어야 합니다."
    );
  }

  tasks[taskIndex] = { id, title, completed };

  return successResponse(res, 200, tasks[taskIndex], "할 일이 수정되었습니다.");
});

/**
 * PUT /api/tasks/:id/toggle
 * completed 상태 토글
 * - 성공: 200 OK
 * - 실패: 404 Not Found
 */
app.put("/api/tasks/:id/toggle", (req, res) => {
  const id = Number(req.params.id);
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return errorResponse(res, 404, "해당 ID의 할 일을 찾을 수 없습니다.");
  }

  task.completed = !task.completed;

  return successResponse(res, 200, task, "완료 상태가 변경되었습니다.");
});

// =======================
//  DELETE APIs (2개)
// =======================

/**
 * DELETE /api/tasks/:id
 * 특정 Task 삭제
 * - 성공: 200 OK
 * - 실패: 404 Not Found
 */
app.delete("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const taskIndex = tasks.findIndex((t) => t.id === id);

  if (taskIndex === -1) {
    return errorResponse(res, 404, "해당 ID의 할 일을 찾을 수 없습니다.");
  }

  const deleted = tasks.splice(taskIndex, 1)[0];

  return successResponse(res, 200, deleted, "할 일이 삭제되었습니다.");
});

/**
 * DELETE /api/tasks
 * 모든 Task 삭제
 * - 성공: 204 No Content (data 없음)
 */
app.delete("/api/tasks", (req, res) => {
  tasks = [];
  return res.status(204).json({
    status: "success",
    data: null,
    message: "모든 할 일이 삭제되었습니다.",
  });
});

// =======================
//  404 처리 미들웨어
// =======================
app.use((req, res, next) => {
  return errorResponse(res, 404, "요청하신 경로를 찾을 수 없습니다.");
});

// =======================
//  에러 처리 미들웨어 (5xx)
// =======================
app.use((err, req, res, next) => {
  console.error("🔥 Error Middleware:", err);
  const statusCode = err.statusCode || 500;
  const message = err.message || "서버 내부 오류가 발생했습니다.";

  return errorResponse(res, statusCode, message);
});

// =======================
//  서버 실행
// =======================
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
