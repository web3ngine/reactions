<?php
declare(strict_types=1);
require_once __DIR__ . '/config/database.php';
if (session_status() !== PHP_SESSION_ACTIVE) { session_start(); }
header('Content-Type: application/json; charset=utf-8');

$userId = null; $guestName = null; $userKey = null; $displayName = 'Guest';
if (!empty($_SESSION['user_id'])) {
    $userId = (int)$_SESSION['user_id']; $userKey = 'u:' . $userId;
    $stmt = $pdo->prepare('SELECT username FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $displayName = $stmt->fetchColumn() ?: 'User';
} elseif (!empty($_SESSION['guest_name'])) {
    $guestName = (string)$_SESSION['guest_name']; $userKey = 'g:' . $guestName;
    $displayName = $guestName;
}

if (!$userKey) { http_response_code(401); echo json_encode(['success'=>false]); exit; }

// Автоматично създаване на таблицата (ако я няма)
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS chat_reactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id INT NOT NULL,
        user_key VARCHAR(120) NOT NULL,
        display_name VARCHAR(120) NOT NULL,
        emoji VARCHAR(16) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_rx (message_id, user_key, emoji)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (Throwable $e) {}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    if ($action === 'list') {
        $rows = $pdo->query("SELECT message_id, emoji, user_key, display_name FROM chat_reactions ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $r) {
            $mid = (string)$r['message_id'];
            $emoji = $r['emoji'];
            if (!isset($out[$mid])) $out[$mid] = [];
            if (!isset($out[$mid][$emoji])) $out[$mid][$emoji] = ['emoji'=>$emoji, 'count'=>0, 'mine'=>false, 'users'=>[]];
            
            $out[$mid][$emoji]['count']++;
            $out[$mid][$emoji]['users'][] = $r['display_name'];
            if ($r['user_key'] === $userKey) $out[$mid][$emoji]['mine'] = true;
        }
        
        $final = [];
        foreach ($out as $mid => $emojis) {
            $final[$mid] = array_values($emojis);
        }
        echo json_encode(['success'=>true, 'reactions'=>$final]);
    }
    elseif ($action === 'toggle') {
        $mid = (int)($_POST['message_id'] ?? 0);
        $emoji = trim($_POST['emoji'] ?? '');
        if ($mid <= 0 || !$emoji) { echo json_encode(['success'=>false]); exit; }

        $stmt = $pdo->prepare("SELECT id FROM chat_reactions WHERE message_id=? AND user_key=? AND emoji=?");
        $stmt->execute([$mid, $userKey, $emoji]);
        $existing = $stmt->fetchColumn();

        if ($existing) {
            $pdo->prepare("DELETE FROM chat_reactions WHERE id=?")->execute([$existing]);
        } else {
            $pdo->prepare("INSERT INTO chat_reactions (message_id, user_key, display_name, emoji) VALUES (?,?,?,?)")
                ->execute([$mid, $userKey, $displayName, $emoji]);
        }
        echo json_encode(['success'=>true]);
    }
} catch (Throwable $e) {
    echo json_encode(['success'=>false, 'error'=>$e->getMessage()]);
}