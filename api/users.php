<?php
/**
 * NutriVital - Users, Biometrics & Admin-Only Health Goals Endpoint
 */
require_once __DIR__ . '/config/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("
        SELECT u.id, u.name, u.email, u.role, u.date_of_birth, u.gender, u.created_at,
               b.systolic_bp, b.diastolic_bp, b.heart_rate, b.body_weight, b.body_mass,
               b.daily_calories, b.height, b.waist_circumference, b.fatty_liver_grade, b.updated_at,
               g.target_systolic_bp, g.target_diastolic_bp, g.target_heart_rate,
               g.target_weight, g.target_body_mass, g.target_calories, g.timeline_weeks, g.set_by_admin_id
        FROM users u
        LEFT JOIN user_biometrics b ON u.id = b.user_id
        LEFT JOIN user_health_goals g ON u.id = g.user_id
        WHERE u.role = 'Cliente'
        ORDER BY u.created_at DESC
    ");
    $clients = $stmt->fetchAll();

    foreach ($clients as &$c) {
        $supStmt = $pdo->prepare("SELECT supplement_id FROM user_active_supplements WHERE user_id = ?");
        $supStmt->execute([$c['id']]);
        $c['activeSupplements'] = $supStmt->fetchAll(PDO::FETCH_COLUMN);

        $repStmt = $pdo->prepare("SELECT * FROM medical_reports WHERE user_id = ? ORDER BY uploaded_at DESC");
        $repStmt->execute([$c['id']]);
        $c['medicalReports'] = $repStmt->fetchAll();
    }

    echo json_encode(['clients' => $clients]);
    exit();
}

if ($method === 'POST') {
    $data = getJsonBody();
    $action = $data['action'] ?? 'register';

    if ($action === 'register') {
        $id = $data['id'] ?? ('CLI-' . rand(100, 999));
        $stmt = $pdo->prepare("INSERT INTO users (id, name, email, password, role, date_of_birth, gender) VALUES (?, ?, ?, ?, 'Cliente', ?, ?)");
        $stmt->execute([
            $id,
            $data['name'],
            $data['email'],
            password_hash($data['password'] ?? 'Cliente2026!', PASSWORD_BCRYPT),
            $data['dateOfBirth'] ?? null,
            $data['gender'] ?? 'Femenino'
        ]);

        // Default biometrics & admin-assigned default goals
        $pdo->prepare("INSERT INTO user_biometrics (user_id) VALUES (?)")->execute([$id]);
        $pdo->prepare("INSERT INTO user_health_goals (user_id, set_by_admin_id) VALUES (?, 'ADM-01')")->execute([$id]);

        echo json_encode(['status' => 'created', 'id' => $id]);
        exit();
    }

    if ($action === 'update_biometrics') {
        // Users can update their own biometrics (including fatty liver), DOB, and gender — NEVER goals
        $userId = $data['userId'];
        if (isset($data['dateOfBirth']) || isset($data['gender'])) {
            $pdo->prepare("UPDATE users SET date_of_birth = COALESCE(?, date_of_birth), gender = COALESCE(?, gender) WHERE id = ?")
                ->execute([$data['dateOfBirth'] ?? null, $data['gender'] ?? null, $userId]);
        }

        $bio = $data['biometrics'];
        $stmt = $pdo->prepare("
            UPDATE user_biometrics
            SET systolic_bp = ?, diastolic_bp = ?, heart_rate = ?, body_weight = ?, body_mass = ?,
                daily_calories = ?, height = ?, waist_circumference = ?, fatty_liver_grade = ?
            WHERE user_id = ?
        ");
        $stmt->execute([
            $bio['systolicBP'], $bio['diastolicBP'], $bio['heartRate'],
            $bio['bodyWeight'], $bio['bodyMass'], $bio['dailyCalories'],
            $bio['height'] ?? 170, $bio['waistCircumference'] ?? 80,
            $bio['fattyLiverGrade'] ?? 0, $userId
        ]);

        echo json_encode(['status' => 'biometrics_updated']);
        exit();
    }

    if ($action === 'update_goals') {
        // Strictly requires Admin authorization
        $adminId = $data['adminId'] ?? null;
        if (!$adminId) {
            http_response_code(403);
            echo json_encode(['error' => 'Solo administradores pueden establecer o modificar metas de salud']);
            exit();
        }
        $g = $data['goals'];
        $stmt = $pdo->prepare("
            UPDATE user_health_goals
            SET target_systolic_bp = ?, target_diastolic_bp = ?, target_heart_rate = ?,
                target_weight = ?, target_body_mass = ?, target_calories = ?,
                timeline_weeks = ?, set_by_admin_id = ?
            WHERE user_id = ?
        ");
        $stmt->execute([
            $g['targetSystolicBP'], $g['targetDiastolicBP'], $g['targetHeartRate'],
            $g['targetWeight'], $g['targetBodyMass'], $g['targetCalories'],
            $g['timelineWeeks'], $adminId, $data['userId']
        ]);

        echo json_encode(['status' => 'goals_updated']);
        exit();
    }
}
?>
