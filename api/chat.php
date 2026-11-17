<?php
/**
 * NutriVital - Gemini AI Chatbot Endpoint with Strict Domain Filtering (PHP)
 */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
$userMessage = trim($data['message'] ?? '');
$userContext = $data['userContext'] ?? [];

$OFF_TOPIC_FALLBACK = "No puedo responder esto, por favor escribe una solicitud coherente con la página.";

if ($userMessage === '') {
    echo json_encode(['reply' => $OFF_TOPIC_FALLBACK]);
    exit();
}

$apiKey = getenv('GEMINI_API_KEY') ?: '';
if ($apiKey === '') {
    http_response_code(503);
    echo json_encode(['error' => 'GEMINI_API_KEY not configured on PHP server']);
    exit();
}

$systemPrompt = "Eres NutriBot, el asistente clínico virtual oficial de NutriVital. "
    . "Solo puedes responder consultas relacionadas con productos NutriVital, suplementos (Omega-3, Magnesio, Matcha, Ashwagandha, Café, Sal, etc.), "
    . "salud nutricional, presión arterial, ritmo cardíaco, hígado graso, informes médicos y funcionamiento de la plataforma. "
    . "Si el usuario pregunta cualquier tema ajeno (programación, política, chistes, deportes, historia, clima, matemáticas, etc.), "
    . "responde ÚNICA y EXACTAMENTE: \"{$OFF_TOPIC_FALLBACK}\" "
    . "Contexto paciente: " . json_encode($userContext);

$payload = [
    'contents' => [
        [
            'role' => 'user',
            'parts' => [
                ['text' => $systemPrompt . "\n\nConsulta del usuario: " . $userMessage]
            ]
        ]
    ]
];

$ch = curl_init("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . urlencode($apiKey));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200 || !$response) {
    http_response_code(502);
    echo json_encode(['error' => 'Error communicating with Gemini API']);
    exit();
}

$decoded = json_decode($response, true);
$replyText = $decoded['candidates'][0]['content']['parts'][0]['text'] ?? $OFF_TOPIC_FALLBACK;

echo json_encode(['reply' => $replyText]);
?>
