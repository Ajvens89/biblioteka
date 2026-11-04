<?php
/**
 * Plugin Name: Zakątek — biblioteka gier
 * Description: Dopasowanie publicznej biblioteki do strony Nasze gry.
 * Version: 1.0.0
 */
if (!defined('ABSPATH')) { exit; }
add_action('wp_enqueue_scripts', static function (): void {
    if (!is_page('nasze-gry')) { return; }
    $base = content_url('/mu-plugins/');
    wp_enqueue_style('zakatek-game-library', $base . 'zakatek-game-library.css', [], '20261105');
    wp_enqueue_script('zakatek-game-library', $base . 'zakatek-game-library.js', [], '20261104', true);
});
