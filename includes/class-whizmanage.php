<?php

/**
 * Main admin class for WhizManage plugin.
 *
 * Handles admin menu creation, data passing to JS, and rendering of the React app.
 */

if (! defined('ABSPATH')) {
    exit;
}

// Include dependencies dynamically (no hardcoded paths)
require_once WHIZMANAGE_DIR . 'includes/products/get-product.php';
require_once WHIZMANAGE_DIR . 'includes/coupons/get-coupons.php';
require_once WHIZMANAGE_DIR . 'includes/products/taxonomies.php';
require_once WHIZMANAGE_DIR . 'includes/products/general-products-functions.php';
require_once WHIZMANAGE_DIR . 'includes/products/custom_fields.php';

if (! class_exists('Whizmanage')) {

    class Whizmanage
    {

        public function __construct()
        {
            add_action('admin_menu', array($this, 'create_admin_menu'));
        }

        /**
         * Create WhizManage menu and submenus under WooCommerce.
         */
        public function create_admin_menu()
        {
            add_menu_page(
                __('WhizManage', 'whizmanage'),
                __('WhizManage', 'whizmanage'),
                'manage_woocommerce',
                'whizmanage',
                array($this, 'whizmanage_products_page'),
                'data:image/svg+xml;base64,' . base64_encode(
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2 2L4 2L9 16L7 16L2 2Z" fill="#a7aaad"/><path d="M8 2L10 2L15 16L13 16L8 2Z" fill="#a7aaad"/><path d="M17 2L15 7L13 2Z" fill="#a7aaad"/></svg>'
                ),
                30
            );
            add_submenu_page(
                'whizmanage',
                __('Product', 'whizmanage'),
                __('Product', 'whizmanage'),
                'manage_woocommerce',
                'whizmanage',
                array($this, 'whizmanage_products_page'),

            );

            add_submenu_page(
                'whizmanage',
                __('Coupons', 'whizmanage'),
                __('Coupons', 'whizmanage'),
                'manage_woocommerce',
                'whizmanage-coupons',
                array($this, 'whizmanage_coupons_page')
            );
        }

        /**
         * Coupons admin page.
         */
        public function whizmanage_coupons_page()
        {
            $this->load_common_data();

            $get_all_coupons  = new Whizmanage_coupons_controller();
            $taxonomies       = new Whizmanage_custom_taxonomy_exporter();

            $jsonListCoupons   = $get_all_coupons->get_all_coupons();
            $status_coupons    = get_option('woocommerce_enable_coupons', 'no');
            $jsonListTaxonomies = $taxonomies->export_custom_taxonomies_to_js();

            $inline_js = sprintf(
                'window.listTaxonomies = %s;
     window.listCoupons = %s;
     window.statusCoupons = %s;',
                wp_json_encode($jsonListTaxonomies),
                wp_json_encode($jsonListCoupons),
                wp_json_encode($status_coupons)
            );

            wp_add_inline_script(
                'whizmanage-script',
                $inline_js,
                'before'
            );


            require_once WHIZMANAGE_DIR . 'templates/app.php';
        }

        /**
         * Products admin page.
         */
        public function whizmanage_products_page()
        {
            // טוען נכסים + נתונים משותפים (inline scripts אחרים)
            $this->load_common_data();

            $get_all_product = new Whizmanage_get_product();
            $taxonomies      = new Whizmanage_custom_taxonomy_exporter();
            $general_product = new Whizmanage_general_products_functions();

            $jsonListTaxonomies = $taxonomies->export_custom_taxonomies_to_js();
            $jsonListProduct    = $get_all_product->get_products();
            $total_product      = $get_all_product->count_all_products();


            $placeholder_url = function_exists('wc_placeholder_img_src')
                ? wc_placeholder_img_src()
                : '';

            $export_ids           = get_option('wm_export_ids');
            $export_custom_fields = get_option('wm_export_custum_fields');
            $shipping_classes     = $general_product->get_all_shipping_classes();
            $sheets_url           = get_option('sheet_url');


            $inline_js = sprintf(
                'window.sheetsUrl = %s;
         window.listTaxonomies = %s;
         window.listExport = %s;
         window.listProduct = %s;
         window.totalProducts = %s;
         window.exportMeta = %s;
         window.shipping = %s;
         window.placeholderImg = %s;',
                wp_json_encode($sheets_url),
                wp_json_encode($jsonListTaxonomies),
                wp_json_encode($export_ids),
                wp_json_encode($jsonListProduct),
                wp_json_encode($total_product),
                wp_json_encode($export_custom_fields),
                wp_json_encode($shipping_classes),
                wp_json_encode($placeholder_url)
            );

            wp_add_inline_script(
                'whizmanage-script',
                $inline_js,
                'before'
            );

            $custom_fields_manager = new Whizmanage_Custom_Fields_Manager();
            $custom_fields_manager->custom_fields_collector();
            $custom_fields_manager->get_all_product_meta_keys();

            require_once WHIZMANAGE_DIR . 'templates/app.php';
        }



        /**
         * Loads common JS data for all WhizManage pages.
         */
        public function load_common_data()
        {
            $this->enqueue_admin_assets();
            $this->output_version_info();

            $woo_lic = get_option('woo_lic');

            global $wpdb;
            $dataWhizmanage = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}whizmanage", ARRAY_A);
            foreach ($dataWhizmanage as &$row) {
                $row['reservedData'] = json_decode($row['reservedData']);
            }

            $shop_url = '';
            if (function_exists('wc_get_page_id')) {
                $shop_page_id = wc_get_page_id('shop');
                if ($shop_page_id && $shop_page_id !== -1) {
                    $shop_url = get_permalink($shop_page_id);
                }
            }

            $inline_js  = 'window.getWhizmanage = ' . wp_json_encode($dataWhizmanage) . ';';
            $inline_js .= 'window.licenseToken = ' . wp_json_encode($woo_lic) . ';';
            $inline_js .= 'window.shopUrl = ' . wp_json_encode($shop_url) . ';';

            if (is_user_logged_in()) {
                $user_id      = get_current_user_id();
                $user_info    = get_userdata($user_id);
                $current_user = wp_get_current_user();
                $email        = get_option('admin_email');
                $user_name    = $user_info ? $user_info->display_name : '';
                $profile_img  = get_avatar_url($current_user->ID, array('size' => 96));
                $inline_js .= 'window.profileName = ' . wp_json_encode($user_name) . ';';
                $inline_js .= 'window.profileImg = ' . wp_json_encode($profile_img) . ';';
                $inline_js .= 'window.adminEmail = ' . wp_json_encode($email) . ';';
            }

            wp_add_inline_script(
                'whizmanage-script',
                $inline_js,
                'before'
            );
        }



        /**
         * Enqueue JS and CSS assets.
         */
        private function enqueue_free_build()
        {
            $asset_path = WHIZMANAGE_DIR . 'build/index.asset.php';
            $asset      = file_exists($asset_path)
                ? include $asset_path
                : array(
                    'dependencies' => array('wp-element'), // fallback
                    'version'      => (defined('WHIZMANAGE_VERSION') ? WHIZMANAGE_VERSION : time()),
                );


            $deps = isset($asset['dependencies']) && is_array($asset['dependencies'])
                ? $asset['dependencies']
                : array();
            $deps = array_unique(array_merge($deps, array('wp-i18n')));


            $css_file = WHIZMANAGE_DIR . 'build/index.css';
            if (file_exists($css_file)) {
                wp_enqueue_style(
                    'whizmanage-style',
                    WHIZMANAGE_URL . 'build/index.css',
                    array(),
                    $asset['version']
                );
            }


            wp_register_script(
                'whizmanage-script',                        // **handle**
                WHIZMANAGE_URL . 'build/index.js',
                $deps,
                $asset['version'],
                true
            );


            if (function_exists('wp_set_script_translations')) {
                wp_set_script_translations(
                    'whizmanage-script',
                    'whizmanage',
                    plugin_dir_path(__FILE__) . 'languages'
                );
            }

            $manual_json = WHIZMANAGE_DIR . 'languages/whizmanage-he_IL-manual.json';
            if (file_exists($manual_json)) {
                $jed = json_decode(file_get_contents($manual_json), true);
                if (isset($jed['locale_data']['whizmanage'])) {
                    $data_js = wp_json_encode($jed['locale_data']['whizmanage']);
                    wp_add_inline_script(
                        'whizmanage-script',
                        'try{wp.i18n.setLocaleData(' . $data_js . ', "whizmanage");}catch(e){}',
                        'before'
                    );
                }
            }

            wp_enqueue_script('whizmanage-script');
        }


        public function enqueue_admin_assets()
        {

            if (! function_exists('is_plugin_active')) {
                require_once ABSPATH . 'wp-admin/includes/plugin.php';
            }


            if (is_plugin_active('whizmanage-pro/whizmanage-pro.php') && has_action('whizmanage_pro/please_enqueue')) {

                do_action('whizmanage_pro/please_enqueue');
                return;
            }


            $this->enqueue_free_build();
        }


        /**
         * Print version, nonce, and site info for frontend.
         */
        public function output_version_info()
        {

            $plugin_data    = get_file_data(WHIZMANAGE_FILE, array('Version' => 'Version'));
            $plugin_version = isset($plugin_data['Version']) ? $plugin_data['Version'] : '';
            $rest_nonce     = wp_create_nonce('wp_rest');
            $site_url       = get_option('siteurl');
            $user_locale    = get_user_locale();
            $store_name     = get_bloginfo('name');
            $currency = function_exists('get_woocommerce_currency')
                ? get_woocommerce_currency()
                : get_option('woocommerce_currency', 'USD');

            $inline_js  = 'window.version = ' . wp_json_encode($plugin_version) . ';';
            $inline_js .= 'window.rest = ' . wp_json_encode($rest_nonce) . ';';
            $inline_js .= 'window.siteUrl = ' . wp_json_encode($site_url) . ';';
            $inline_js .= 'window.user_local = ' . wp_json_encode($user_locale) . ';';
            $inline_js .= 'window.store_name = ' . wp_json_encode($store_name) . ';';
            $inline_js .= 'window.currency = ' . wp_json_encode($currency) . ';';

            wp_add_inline_script(
                'whizmanage-script',
                $inline_js,
                'before'
            );
        }
    }
}
