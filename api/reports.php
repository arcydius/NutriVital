<?php
/**
 * NutriVital - Per-User Medical Reports Mini Cloud Endpoint
 * Saves metadata to MySQL and stores physical files in uploads/{userId}/
 */
require_once __DIR__ . '/config/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];
$uploadBase = __DIR__ . '/../uploads';

if (!is_dir($uploadBase)) {
    @mkdir($uploadBase, 0775, true);
}

if ($method === 'GET') {
    $userId = $_GET['userId'] ?? '';
    $reportId = $_GET['downloadId'] ?? '';

    if ($reportId) {
        $stmt = $pdo->prepare("SELECT * FROM medical_reports WHERE id = ?");
        $stmt->execute([$reportId]);
        $rep = $stmt->fetch();
        if (!$rep) {
            http_response_code(404);
            echo json_encode(['error' => 'Informe no encontrado']);
            exit();
        }
        // Serve plain text summary download if requested
        if (($_GET['format'] ?? '') === 'txt') {
            header("Content-Type: text/plain; charset=UTF-8");
            header("Content-Disposition: attachment; filename=\"NutriVital_{$rep['file_name']}.txt\"");
            echo "INFORME MEDICO NUTRIVITAL\n";
            echo "Archivo: {$rep['file_name']}\n";
            echo "Tipo: {$rep['report_type']}\n";
            echo "Fecha: {$rep['report_date']}\n\n";
            echo "Resumen Clinico:\n{$rep['ai_clinical_summary']}\n\n";
            echo "Marcadores:\n{$rep['markers_json']}\n";
            exit();
        }
        echo json_encode(['report' => $rep]);
        exit();
    }

    if ($userId) {
        $stmt = $pdo->prepare("SELECT * FROM medical_reports WHERE user_id = ? ORDER BY uploaded_at DESC");
        $stmt->execute([$userId]);
        echo json_encode(['reports' => $stmt->fetchAll()]);
        exit();
    }

    echo json_encode(['error' => 'Se requiere userId']);
    exit();
}

if ($method === 'POST') {
    $data = getJsonBody();
    $userId = $data['userId'] ?? 'CLI-01';
    $userDir = $uploadBase . '/' . preg_replace('/[^a-zA-Z0-9_-]/', '', $userId);
    if (!is_dir($userDir)) {
        @mkdir($userDir, 0775, true);
    }

    $rep = $data['report'];
    $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $rep['fileName']);
    $filePath = $userDir . '/' . $rep['id'] . '_' . $safeName;

    if (!empty($data['rawContent'])) {
        file_put_contents($filePath, $data['rawContent']);
    }

    $stmt = $pdo->prepare("
        INSERT INTO medical_reports
        (id, user_id, file_name, file_path, report_type, report_date, ai_clinical_summary,
         markers_json, flagged_findings, contraindications, detected_systolic_bp, detected_diastolic_bp, detected_heart_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $rep['id'],
        $userId,
        $rep['fileName'],
        $filePath,
        $rep['reportType'],
        $rep['reportDate'] ?? date('Y-m-d'),
        $rep['aiClinicalSummary'],
        json_encode($rep['markers'] ?? new stdClass()),
        json_encode($rep['flaggedFindings'] ?? []),
        json_encode($rep['contraindications'] ?? []),
        $rep['detectedSystolicBP'] ?? null,
        $rep['detectedDiastolicBP'] ?? null,
        $rep['detectedHeartRate'] ?? null,
    ]);

    echo json_encode(['status' => 'saved', 'id' => $rep['id']]);
    exit();
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if ($id) {
        $stmt = $pdo->prepare("SELECT file_path FROM medical_reports WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if ($row && !empty($row['file_path']) && file_exists($row['file_path'])) {
            @unlink($row['file_path']);
        }
        $pdo->prepare("DELETE FROM medical_reports WHERE id = ?")->execute([$id]);
    }
    echo json_encode(['status' => 'deleted']);
    exit();
}
?>
