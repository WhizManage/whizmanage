<?php
if (!defined('ABSPATH')) {
    exit;
}
if (!class_exists('Whizmanage_Discount_Init')) {
class Whizmanage_Discount_Init
{
    public static function init()
    {
        /**
         * Plugin bootstrap (init.php content)
         */

        if (!defined('WHIZ_DR_POPUP_MODE')) {
            define('WHIZ_DR_POPUP_MODE', true);
        }

        if (!defined('WHIZ_DR_TABLE')) {
            global $wpdb;
            define('WHIZ_DR_TABLE', $wpdb->prefix . 'whiz_discount_rules');
        }

        add_action('init', __CLASS__ . '::maybe_load_shortcode');
        
        require_once __DIR__ . '/class-whizmanage-discount-functions.php';
        require_once __DIR__ . '/class-discount-rule.php';
        require_once __DIR__ . '/class-discount-manager.php';
        require_once __DIR__ . '/class-discount-api.php';
        require_once __DIR__ . '/class-whizmanage-discount-shortcode.php';

        add_action('plugins_loaded', __CLASS__ . '::maybe_install');

        if (function_exists('register_activation_hook')) {
            // Cannot use register_activation_hook from within a class method easily if __FILE__ is needed from original context, 
            // but we can just leave it to the caller or bind it if we know the main file. 
            // However, usually init.php is included. 
            // For now, we'll keep the logic but it might fail if __FILE__ is not the main plugin file.
            // Since this refactor is internal, we'll assume the hook is registered elsewhere or we use the passed file.
            // Actually, best practice is to register this in the main plugin file. 
            // But to replicate init.php behavior, we will register it if we can. 
            // Note: register_activation_hook uses the filename passed to it. 
            // We will expose the install method public static.
        }

        add_action('rest_api_init', function () {
            $api = new Whiz_Discount_API();
            $api->register_routes();
        });

        add_action('woocommerce_before_calculate_totals', ['Whiz_Discount_Manager', 'apply_item_discounts'], 20, 1);
        add_action('woocommerce_cart_calculate_fees', ['Whiz_Discount_Manager', 'apply_cart_discounts'], 20, 1);
        add_action('woocommerce_cart_item_removed', ['Whiz_Discount_Manager', 'track_rejected_gift'], 10, 2);

        add_filter('woocommerce_cart_item_name', ['Whiz_Discount_Manager', 'customize_cart_item_name'], 10, 3);

        add_action('wp_enqueue_scripts', __CLASS__ . '::enqueue_scripts');
        add_action('wp_footer', __CLASS__ . '::output_modal_styles');

        // UI: צ'קבוקס בעגלת הקניות
        add_action('woocommerce_cart_totals_before_order_total', __CLASS__ . '::cart_coupon_checkbox', 9);
        
        // קבלת הבחירה מהטופס
        add_action('wp_loaded', __CLASS__ . '::handle_cart_post_data');

        // Pro features disabled in free version:
        // - Bulk tier label display
        // - Shipping discount filtering
        
        add_action('woocommerce_checkout_create_order', function (WC_Order $order, $data) {
            $rules = Whiz_Discount_Manager::get_applied_rules(true); // ← merge_session = true
            if (!empty($rules)) {
                $order->update_meta_data('_whiz_applied_rules', wp_json_encode($rules, JSON_UNESCAPED_UNICODE));
            }
        }, 100, 2);

        add_action('woocommerce_store_api_checkout_order_processed', function (WC_Order $order) {
            $rules = Whiz_Discount_Manager::get_applied_rules(true); // ← merge_session = true
            if (!empty($rules)) {
                $order->update_meta_data('_whiz_applied_rules', wp_json_encode($rules, JSON_UNESCAPED_UNICODE));
                $order->save();
            }
        }, 10, 1);

        add_action('woocommerce_thankyou', function () {
            if (function_exists('WC') && WC()->session) {
                WC()->session->__unset('whiz_applied_rules');
                WC()->session->__unset('whiz_shipping_discount_label');
                WC()->session->__unset('whiz_bulk_last_before');
                WC()->session->__unset('whiz_bulk_last_after');
                WC()->session->__unset('whiz_dr_rejected_gifts'); // איפוס רשימת הדחויים לאחר רכישה
            }
        }, 20);

        // Pro features disabled (BOGO/BXGY gift notifications):

        // Pro features disabled (gift rejection tracking for BOGO/BXGY):

        add_filter('woocommerce_cart_item_name', ['Whiz_Discount_Manager', 'customize_cart_item_name'], 10, 3);
        
        // Enqueue again? Original file had duplicate enqueue. We will keep just one sufficient one.
        // But original file had two blocks of enqueue. We will consolidate into `enqueue_scripts`.
    }

    /**
     * Load shortcode file only if there is at least one rule in DB.
     */
    public static function maybe_load_shortcode()
    {
        // נטען shortcode רק בפרונט (לא חובה, אבל לרוב הגיוני)
        if (is_admin()) {
            return;
        }

        global $wpdb;

        if (!defined('WHIZ_DR_TABLE')) {
            return;
        }

        $table = WHIZ_DR_TABLE;

        // לוודא שהטבלה קיימת (למקרה שהתוסף רק הותקן / לא נוצרה טבלה)
        $table_exists = $wpdb->get_var(
            $wpdb->prepare(
                "SHOW TABLES LIKE %s",
                $table
            )
        );

        if ($table_exists !== $table) {
            return;
        }

        // לבדוק אם יש חוקים פבליש באתר
        $rules_count = (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM {$table} WHERE status = 'publish'"
        );

        if ($rules_count > 0) {
            Whizmanage_Discount_Shortcode::init();
        }
    }

    public static function maybe_install()
    {
        $version = get_option('whiz_dr_db_version', '0');
        $target = '2.0.0';

        if (version_compare($version, $target, '>=')) {
            return;
        }

        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE " . WHIZ_DR_TABLE . " (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(191) NOT NULL,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'publish',
        start_date DATETIME NULL,
        end_date DATETIME NULL,
        conditions LONGTEXT NULL,
        actions LONGTEXT NOT NULL,
        filters LONGTEXT NULL,
        message TEXT NULL,
        priority INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        show_message TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        KEY type_idx (type),
        KEY status_idx (status),
        KEY start_date_idx (start_date),
        KEY end_date_idx (end_date),
        KEY priority_idx (priority)
    ) $charset_collate;";


        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta($sql);

        update_option('whiz_dr_db_version', $target);
    }

    public static function enqueue_scripts() {
        if (is_admin())
            return;

        // הוספת 'wp-data' כדי להבטיח זמינות wp.data ב-Blocks
        wp_enqueue_script(
            'whiz-dr-offer',
            plugins_url('assets/offer.js', __FILE__),
            array('jquery', 'wp-data'),
            '1.2.4', // הגבה לגרסה חדשה
            true
        );

        wp_localize_script('whiz-dr-offer', 'whizDR', array(
            'apiBase' => esc_url_raw(rest_url('whizmanage/v1')),
            'nonce' => wp_create_nonce('wp_rest'),
        ));
    }

    public static function output_modal_styles() {
        if (is_admin())
            return;
    ?>
        <style id="whiz-dr-offer-fallback-css">
            .whiz-offer-modal {
                position: fixed;
                inset: 0;
                display: none;
                justify-content: center;
                align-items: center;
                background: rgba(0, 0, 0, 0.6);
                z-index: 9999;
            }

            .whiz-offer-modal[aria-hidden="false"] {
                display: flex;
            }

            .whiz-offer-content {
                background: #fff;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                max-width: 420px;
                width: 90%;
                box-shadow: 0 10px 30px rgba(0, 0, 0, .2);
            }

            .whiz-offer-actions {
                margin-top: 14px;
                display: flex;
                gap: 10px;
                justify-content: center;
            }

            .whiz-offer-content .button {
                min-width: 100px;
            }

            .whiz-offer-content .button-primary {
                background: #0073aa;
                border-color: #006799;
                color: #fff;
            }

            .whiz-offer-content .button-primary:hover {
                background: #005a87;
                border-color: #004c6f;
            }

            .whiz-offer-content .button-secondary {
                background: #f7f7f7;
                border-color: #ccc;
                color: #555;
            }

            .whiz-offer-content .button-secondary:hover {
                background: #fafafa;
                border-color: #999;
            }
        </style>
        <div id="whiz-offer-modal" class="whiz-offer-modal" aria-hidden="true" role="dialog"
            aria-labelledby="whiz-offer-title" aria-describedby="whiz-offer-message">
            <div class="whiz-offer-content">
                <h3 id="whiz-offer-title"><?php esc_html_e('Special Offer!', 'whizmanage'); ?></h3>
                <p id="whiz-offer-message"><?php esc_html_e('We have a special offer for you!', 'whizmanage'); ?></p>

                <div class="whiz-offer-actions">
                    <button type="button" id="whiz-offer-accept" class="button button-primary">
                        <?php esc_html_e('Add to Cart', 'whizmanage'); ?>
                    </button>

                    <button type="button" id="whiz-offer-decline" class="button button-secondary">
                        <?php esc_html_e('No Thanks', 'whizmanage'); ?>
                    </button>
                </div>
            </div>
        </div>

    <?php
    }

    public static function cart_coupon_checkbox() {
        if (is_admin()) {
            return;
        }
        if (! function_exists('WC') || ! WC()->cart || WC()->cart->is_empty()) {
            return;
        }
    
        $checked = (WC()->session) ? (bool) WC()->session->get('whiz_dr_as_coupon', false) : false;
    ?>
        <div class="whiz-as-coupon" style="margin:.5rem 0">
            <label>
                <input type="checkbox" name="whiz_dr_as_coupon" value="1" <?php checked($checked, true); ?> />
                <?php esc_html_e('Apply discounts as a single coupon (don&#8217;t change item prices)', 'whizmanage'); ?>
            </label>
        </div>
    <?php
    }

    public static function handle_cart_post_data() {
        if (!function_exists('WC') || !WC()->session)
            return;
        if (isset($_POST['whiz_dr_as_coupon']) || isset($_POST['update_cart']) || isset($_POST['apply_coupon'])) {
            $val = !empty($_POST['whiz_dr_as_coupon']);
            WC()->session->set('whiz_dr_as_coupon', $val);
            if (function_exists('wc_load_cart'))
                wc_load_cart();
            if (WC()->cart)
                WC()->cart->calculate_totals();
        }
    }

    public static function display_bulk_tier_label($item_data, $cart_item) {
        if (!empty($cart_item['whiz_dr_label'])) {
            $label = wp_strip_all_tags((string) $cart_item['whiz_dr_label']);
            // נשתמש ב-display כדי לאפשר HTML קטן ואסתטי
            $item_data[] = [
                'name' => '', // בלי כותרת שמאלית
                'value' => $label, // גיבוי – אם תבנית מתעלמת מ-display
                'display' => '<small class="whiz-bulk-label" style="color:#1f7a8c;font-weight:600;">'
                    . esc_html($label)
                    . '</small>',
            ];
        }
        return $item_data;
    }

    public static function handle_gift_actions() {
        // 1. Restore Gift
        if (isset($_GET['whiz_restore_gift'])) {
            // בדיקת אבטחה (Nonce)
            $nonce = isset($_GET['_wpnonce']) ? $_GET['_wpnonce'] : '';
            if (!wp_verify_nonce($nonce, 'whiz_restore_gift_action')) {
                wc_add_notice(__('Security check failed. Please refresh the page and try again.', 'whizmanage'), 'error');
                $redirect = remove_query_arg(['whiz_restore_gift', '_wpnonce']);
                wp_safe_redirect($redirect);
                exit;
            }
    
            $sig = sanitize_text_field($_GET['whiz_restore_gift']);
            Whiz_Discount_Manager::unreject_gift($sig);
            // wc_add_notice(__('Gift restored! It will appear in your cart momentarily.', 'whizmanage'), 'success');
            $redirect = remove_query_arg(['whiz_restore_gift', '_wpnonce']);
            wp_safe_redirect($redirect);
            exit;
        }
    
        // 2. Accept Offer
        if (isset($_GET['whiz_accept_offer'])) {
            // בדיקת אבטחה (Nonce)
            $nonce = isset($_GET['_wpnonce']) ? $_GET['_wpnonce'] : '';
            if (!wp_verify_nonce($nonce, 'whiz_accept_offer_action')) {
                wc_add_notice(__('Security check failed. Please refresh the page and try again.', 'whizmanage'), 'error');
                $redirect = remove_query_arg(['whiz_accept_offer', '_wpnonce']);
                wp_safe_redirect($redirect);
                exit;
            }
    
            $res = Whiz_Discount_Manager::accept_offer();
            // if (is_wp_error($res)) {
            //     wc_add_notice($res->get_error_message(), 'error');
            // } else {
            //     wc_add_notice(__('Offer accepted! The item has been added to your cart.', 'whizmanage'), 'success');
            // }
            $redirect = remove_query_arg(['whiz_accept_offer', '_wpnonce']);
            wp_safe_redirect($redirect);
            exit;
        }
    }

    public static function output_floating_toasts() {
        if (is_admin()) return;
        if (!function_exists('is_cart') || !function_exists('is_checkout')) return;
        if (!is_cart() && !is_checkout()) return;
    
        // יצירת Nonces לקישורים
        $restore_nonce = wp_create_nonce('whiz_restore_gift_action');
        $accept_nonce = wp_create_nonce('whiz_accept_offer_action');
    
        $restore_opportunities = Whiz_Discount_Manager::get_rejected_opportunities();
        $special_offer = Whiz_Discount_Manager::current_offer();
    
        // אם אין שום דבר להציג, יוצאים
        if (empty($restore_opportunities) && empty($special_offer)) return;
    
        // סגנון לכפתורים הצפים
        echo '<style>
            .whiz-toasts-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                z-index: 999999;
                max-width: 90%;
                width: auto;
            }
            .whiz-toast {
                background: #fff;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 15px 20px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                gap: 15px;
                font-family: inherit;
                animation: whizSlideIn 0.5s ease-out;
                width: fit-content;
            }
            .whiz-toast.restore-toast {
                border-left: 5px solid #4caf50;
            }
            .whiz-toast.offer-toast {
                border-left: 5px solid #2196f3;
            }
            @keyframes whizSlideIn {
                from { transform: translateX(100px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .whiz-toast strong {
                display: block;
                color: #333;
                font-size: 14px;
                margin-bottom: 2px;
            }
            .whiz-toast small {
                color: #666;
            }
            .whiz-toast-btn {
                color: #fff !important;
                text-decoration: none;
                padding: 8px 15px;
                border-radius: 4px;
                font-weight: bold;
                font-size: 13px;
                white-space: nowrap;
                transition: background 0.2s;
            }
            .whiz-toast-btn.restore-btn {
                background: #4caf50;
            }
            .whiz-toast-btn.restore-btn:hover {
                background: #43a047;
            }
            .whiz-toast-btn.offer-btn {
                background: #2196f3;
            }
            .whiz-toast-btn:hover {
                background: #1976d2;
            }
        </style>';
    
        echo '<div class="whiz-toasts-container">';
    
        // 1. Restore Toasts (100% מתנות שהוסרו)
        if (!empty($restore_opportunities)) {
            foreach ($restore_opportunities as $sig => $info) {
                $pid     = (int) $info['pid'];
                $product = wc_get_product($pid);
                $title   = $product ? $product->get_name() : get_the_title($pid);
    
                // הוספת Nonce ל-URL
                $restore_url = add_query_arg(
                    [
                        'whiz_restore_gift' => $sig,
                        '_wpnonce'          => $restore_nonce,
                    ]
                );
    
                echo '<div class="whiz-toast restore-toast">';
                echo '<div>';
                echo '<strong>🎁 ' . esc_html__('Gift Available!', 'whizmanage') . '</strong>';
                echo '<small>' . esc_html($title) . '</small>';
                echo '</div>';
                echo '<a href="' . esc_url($restore_url) . '" class="whiz-toast-btn restore-btn">'
                    . esc_html__('Add to Cart', 'whizmanage')
                    . '</a>';
                echo '</div>';
            }
        }
    
    
        // 2. Special Offer Toast (הנחות חלקיות)
        if ($special_offer) {
            $pid = $special_offer['product_id'];
            $product = wc_get_product($pid);
            $title = $product ? $product->get_name() : get_the_title($pid);
            $pct = $special_offer['discount_pct'];
    
            // הוספת Nonce ל-URL
            $accept_url = add_query_arg([
                'whiz_accept_offer' => '1',
                '_wpnonce' => $accept_nonce
            ]);
    
            $msg_title = __('Special Deal!', 'whizmanage');
    
            $msg_desc = sprintf(
                /* translators: 1: product title, 2: discount percentage */
                __('%1$s at %2$s%% OFF', 'whizmanage'),
                esc_html($title),
                $pct
            );
    
    
    
            echo '<div class="whiz-toast offer-toast">';
            echo '<div>';
            echo '<strong>🏷️ ' . esc_html($msg_title) . '</strong>';
            echo '<small>' . wp_kses_post($msg_desc) . '</small>';
            echo '</div>';
            echo '<a href="' . esc_url($accept_url) . '" class="whiz-toast-btn offer-btn">'
                . esc_html__('Add Offer', 'whizmanage')
                . '</a>';
            echo '</div>';
        }
    
        echo '</div>'; // End container
    }
}
}