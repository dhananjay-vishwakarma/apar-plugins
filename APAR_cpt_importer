<?php
/**
 * Plugin Name: APAR CPT Importer (Chunked + Progress Bar)
 * Description: Import APAR CPTs from JSON with chunked AJAX processing and progress bar.
 * Version: 3.0.0
 * Author: APAR
 */

if (!defined('ABSPATH')) exit;

class APAR_CPT_Importer_Chunked {

    const SLUG  = 'apar-cpt-importer';
    const NONCE = 'apar_cpt_import_nonce';

    public function __construct() {
        add_action('admin_menu',  [$this, 'add_import_page']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
        add_action('wp_ajax_apar_cpt_process_chunk', [$this, 'ajax_process_chunk']);
    }

    public function add_import_page() {
        add_management_page(
            'Import APAR CPTs',
            'Import APAR CPTs',
            'manage_options',
            self::SLUG,
            [$this, 'render_import_page']
        );
    }

    public function enqueue_assets($hook) {
        if ($hook !== 'tools_page_' . self::SLUG) return;
        wp_enqueue_script('apar-cpt-importer', plugin_dir_url(__FILE__) . 'importer.js', ['jquery'], '3.0.0', true);
        wp_localize_script('apar-cpt-importer', 'AparCPT', [
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce'   => wp_create_nonce(self::NONCE),
        ]);
        wp_enqueue_style('apar-cpt-importer', plugin_dir_url(__FILE__) . 'importer.css', [], '3.0.0');
    }

    public function render_import_page() {
        if (!current_user_can('manage_options')) return;

        if (!empty($_FILES['apar_import_file']['tmp_name'])) {
            check_admin_referer(self::NONCE);

            $file = $_FILES['apar_import_file']['tmp_name'];
            $json = file_get_contents($file);
            $data = json_decode($json, true);
            if (!$data) wp_die('Invalid JSON.');

            // Save data in transient for chunk processing
            set_transient('apar_cpt_import_data', $data, HOUR_IN_SECONDS);
            ?>
            <div class="wrap">
                <h1>Importing APAR CPTs…</h1>
                <div id="apar-progress-wrap">
                    <div id="apar-progress-bar"></div>
                </div>
                <p id="apar-progress-text">Starting import…</p>
                <script>
                    jQuery(function($){ window.startAparImport(<?php echo count($data); ?>); });
                </script>
            </div>
            <?php
            return;
        }
        ?>
        <div class="wrap">
            <h1>Import APAR Custom Post Types</h1>
            <form method="post" enctype="multipart/form-data">
                <?php wp_nonce_field(self::NONCE); ?>
                <input type="file" name="apar_import_file" accept=".json" required>
                <p class="submit"><button class="button button-primary">Upload & Start Import</button></p>
            </form>
        </div>
        <?php
    }

    public function ajax_process_chunk() {
        check_ajax_referer(self::NONCE, 'nonce');
        $data = get_transient('apar_cpt_import_data');
        if (!$data) wp_send_json_error(['msg' => 'No import data found.']);

        $offset = intval($_POST['offset'] ?? 0);
        $limit  = 10; // number of posts per chunk

        $slice = array_slice($data, $offset, $limit);
        foreach ($slice as $item) {
            $this->import_single($item);
        }

        $done = $offset + count($slice);
        $total = count($data);

        if ($done >= $total) {
            delete_transient('apar_cpt_import_data');
            wp_send_json_success(['done' => $done, 'total' => $total, 'finished' => true]);
        } else {
            wp_send_json_success(['done' => $done, 'total' => $total, 'finished' => false]);
        }
    }

    private function import_single($item) {
        $post_type = sanitize_key($item['post_type'] ?? 'post');
        $slug      = sanitize_title($item['slug'] ?? '');
        if (!$slug) return;

        // Register CPT if missing
        if (!post_type_exists($post_type)) {
            register_post_type($post_type, [
                'label'    => ucfirst(str_replace('_', ' ', $post_type)),
                'public'   => true,
                'show_ui'  => true,
                'supports' => ['title','editor','excerpt','thumbnail'],
            ]);
        }

        $existing = get_page_by_path($slug, OBJECT, $post_type);
        $postarr = [
            'post_type'    => $post_type,
            'post_status'  => sanitize_key($item['post_status'] ?? 'publish'),
            'post_name'    => $slug,
            'post_title'   => wp_kses_post($item['title'] ?? ''),
            'post_content' => wp_kses_post($item['content'] ?? ''),
            'post_excerpt' => wp_kses_post($item['excerpt'] ?? ''),
            'post_author'  => 1,
            'post_date'    => current_time('mysql'),
        ];
        $post_id = $existing ? wp_update_post(array_merge($postarr, ['ID' => $existing->ID]), true)
                             : wp_insert_post($postarr, true);
        if (is_wp_error($post_id)) return;

        // Meta
        if (!empty($item['meta'])) {
            foreach ($item['meta'] as $k => $v) {
                update_post_meta($post_id, sanitize_key($k), maybe_serialize($v));
            }
        }
    }
}

new APAR_CPT_Importer_Chunked();
