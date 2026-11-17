<?php
/**
 * NutriVital - Products & Supplements Catalog Endpoint (incl. Coffee & Salt)
 */
require_once __DIR__ . '/config/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $products = $pdo->query("SELECT * FROM products ORDER BY id ASC")->fetchAll();
    $supplements = $pdo->query("SELECT * FROM supplements ORDER BY id ASC")->fetchAll();
    $sales = $pdo->query("SELECT * FROM sales_history ORDER BY week ASC")->fetchAll();

    echo json_encode([
        'products' => $products,
        'supplements' => $supplements,
        'salesHistory' => $sales,
    ]);
    exit();
}

if ($method === 'POST') {
    $data = getJsonBody();
    $p = $data['product'] ?? null;
    if ($p) {
        $stmt = $pdo->prepare("
            REPLACE INTO products (id, name, category, tag, calories, protein, fiber, price, stock, status, description, serving_size, illustration)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $p['id'], $p['name'], $p['category'], $p['tag'],
            $p['calories'], $p['protein'], $p['fiber'], $p['price'],
            $p['stock'], $p['status'], $p['description'], $p['servingSize'], $p['illustration']
        ]);
        echo json_encode(['status' => 'saved', 'id' => $p['id']]);
        exit();
    }
}
?>
