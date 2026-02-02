<?php

/**
 * Plugin Name:       WhizManage
 * Plugin URI:        https://whizmanage.com/
 * Description:       Easily manage your WooCommerce store with advanced bulk editing, product organization, and smart tools.
 * Version:           2.2.1
 * Author:            WhizManage
 * Author URI: https://whizmanage.com/
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Text Domain:       whizmanage
 * Domain Path:       /languages
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 *
 * WhizManage Free is licensed under the GPLv2 or later.
 * You are free to use, modify, and redistribute this plugin under the same license.
 *
 * For additional features, see WhizManage Pro: https://whizmanage.com/#pricing
 */




if (! defined('ABSPATH')) {
	exit;
}

/**
 * Define plugin constants.
 */
define('WHIZMANAGE_VERSION', '2.2.1');
define('WHIZMANAGE_FILE', __FILE__);
define('WHIZMANAGE_BASENAME', plugin_basename(__FILE__));
define('WHIZMANAGE_DIR', plugin_dir_path(__FILE__));
define('WHIZMANAGE_URL', plugin_dir_url(__FILE__));



/**
 * Ensure plugin.php functions are available (is_plugin_active, etc.).
 */
if (! function_exists('is_plugin_active')) {
	require_once ABSPATH . 'wp-admin/includes/plugin.php';
}

/**
 * Hard dependency check for WooCommerce.
 * - Blocks activation if WooCommerce is missing.
 * - Shows admin notice if deactivated later.
 */
function whizmanage_on_activation()
{
	if (! class_exists('WooCommerce')) {
		deactivate_plugins(WHIZMANAGE_BASENAME);
		wp_die(
			esc_html__('WhizManage requires WooCommerce to be installed and active.', 'whizmanage') . ' ' .
				'<a href="' . esc_url(admin_url('plugins.php')) . '">' . esc_html__('Go back', 'whizmanage') . '</a>'
		);
	}

	// Create or update required DB tables.
	whizmanage_create_main_table();
	whizmanage_create_history_table();
	whizmanage_register_whizmanage_role();
}
register_activation_hook(__FILE__, 'whizmanage_on_activation');


/**
 * Register WhizManage custom role and capabilities
 * Copies all shop_manager capabilities for full WooCommerce access
 */
function whizmanage_register_whizmanage_role()
{
	// Add use_whizmanage capability to admin and shop_manager
	$admin = get_role('administrator');
	if ($admin) {
		$admin->add_cap('use_whizmanage');
	}

	$shop_manager = get_role('shop_manager');
	if ($shop_manager) {
		$shop_manager->add_cap('use_whizmanage');
	}

	// Copy shop_manager capabilities (or fallback to basic if WC not loaded)
	$capabilities = array(
		'read'           => true,
		'use_whizmanage' => true,
	);

	if ($shop_manager && !empty($shop_manager->capabilities)) {
		$capabilities = array_merge($capabilities, $shop_manager->capabilities);
		unset($capabilities['manage_woocommerce']); // Remove WC settings access
	}

	// Recreate role with updated capabilities
	remove_role('whizmanage_user');
	add_role(
		'whizmanage_user',
		__('WhizManage User', 'whizmanage'),
		$capabilities
	);
}
/**
 * Soft check on every admin load – show notice if WooCommerce inactive.
 */
function whizmanage_wc_admin_notice()
{
	if (! class_exists('WooCommerce')) {
		echo '<div class="notice notice-error"><p>' .
			esc_html__('WhizManage requires WooCommerce to be installed and active.', 'whizmanage') .
			'</p></div>';
	}
}
add_action('admin_notices', 'whizmanage_wc_admin_notice');

/**
 * Free + Pro together:
 * We DO NOT auto-deactivate the free version if Pro is active.
 * Instead we expose a handshake hook so Pro can take over UI/assets/features.
 *
 * - If Pro is active, we fire a hook Pro listens to: 'whizmanage_pro/please_enqueue'.
 * - Free continues to work for shared components, while Pro can override/extend.
 */
function whizmanage_plugins_loaded_bootstrap()
{
	// Core includes (always load minimal/core parts).
	require_once WHIZMANAGE_DIR . 'includes/class-whizmanage.php';
	require_once WHIZMANAGE_DIR . 'includes/rest-functions-main.php';
	require_once WHIZMANAGE_DIR . 'includes/products/rest-functions-product.php';
	require_once WHIZMANAGE_DIR . 'includes/coupons/general-coupons-functions.php';
	require_once WHIZMANAGE_DIR . 'includes/products/general-products-functions.php';
	require_once WHIZMANAGE_DIR . 'includes/coupons/rest-functions-coupons.php';
	require_once WHIZMANAGE_DIR . 'includes/products/taxonomies.php';
	require_once WHIZMANAGE_DIR . 'includes/customers/rest-functions-customers.php';
	require_once WHIZMANAGE_DIR . 'includes/orders/rest-functions-orders.php';
	// Discount rules: register routes, manager and helpers
	require_once WHIZMANAGE_DIR . 'includes/discount-rules/class-whizmanage-discount-init.php';
	require_once WHIZMANAGE_DIR  . 'includes/settings/rest-functions-settings.php';
	require_once WHIZMANAGE_DIR  . 'includes/settings/rest-functions-shipping.php';
	Whizmanage_Discount_Init::init();

	// Bootstrap classes.
	new Whizmanage();
	new Whizmanage_rest_functions_main();
	new Whizmanage_rest_functions_product();
	new Whizmanage_rest_functions_coupons();
	new Whizmanage_rest_functions_orders();
	new Whizmanage_Discount_Init();
	new Whizmanage_rest_functions_customers();
	new Whizmanage_custom_taxonomy_exporter();
	new Whizmanage_general_coupons_functions();
	new Whizmanage_general_products_functions();
	 new Whizmanage_rest_functions_settings();
    new Whizmanage_rest_functions_shipping();

}
add_action('plugins_loaded', 'whizmanage_plugins_loaded_bootstrap', 5);

/**
 * Version-aware DB upgrades + one-time tasks on update.
 */
require_once WHIZMANAGE_DIR . 'includes/class-whizmanage-upgrade.php';

add_action('plugins_loaded', function () {
	$up = new Whizmanage_Upgrade();

	// If the code version differs from the stored version – trigger a one-time "seed" task.
	$installed = get_option(Whizmanage_Upgrade::OPTION_VERSION);
	if ($installed !== WHIZMANAGE_VERSION) {
		// This is the "flag": it will run once and then be automatically cleared by the class.
		update_option(Whizmanage_Upgrade::OPTION_FORCE_TASK, 'seed_defaults');
	}

	// Run any required migrations or one-time tasks, and update the stored plugin version.
	$up->maybe_run_upgrades();
}, 1);


register_deactivation_hook(__FILE__, 'whizmanage_deactivate_plugin');
function whizmanage_deactivate_plugin()
{
	remove_role('whizmanage_user');
}


/**
 * Plugin row action links (Settings + Go Pro).
 */
function whizmanage_plugin_action_links($links)
{
	// Always show link to the editor page
	$custom = array(
		'<a href="' . esc_url(admin_url('admin.php?page=whizmanage')) . '">' .
			esc_html__('Products Editor', 'whizmanage') . '</a>',
	);

	// Add "Go Pro" link only if Pro version is not active
	if (
		!defined('WHIZMANAGE_PRO_VERSION') && // Constant check
		!class_exists('Whizmanage_Pro') &&    // Class check (in case constant not defined)
		!function_exists('whizmanage_is_pro_active')  // Optional helper check
	) {
		$custom[] = '<a target="_blank" style="font-weight:bold;color:#2271b1;" href="' . esc_url('https://whizmanage.com/pricing') . '">' .
			esc_html__('Go Pro', 'whizmanage') . '</a>';
	}

	return array_merge($custom, $links);
}
add_filter('plugin_action_links_' . WHIZMANAGE_BASENAME, 'whizmanage_plugin_action_links', 50);


/**
 * Database: create main options table if needed.
 * Safe to call multiple times; uses dbDelta for schema changes.
 */
function whizmanage_create_main_table()
{
	global $wpdb;

	$table_name        = $wpdb->prefix . 'whizmanage';
	$table_name_escaped = esc_sql($table_name);
	$charset_collate   = $wpdb->get_charset_collate();

	require_once ABSPATH . 'wp-admin/includes/upgrade.php';

	$sql = "CREATE TABLE `" . $table_name_escaped . "` (
        id INT NOT NULL AUTO_INCREMENT,
        name TEXT NOT NULL,
        reservedData LONGTEXT NOT NULL,
        PRIMARY KEY (id)
    ) {$charset_collate};";

	dbDelta($sql);

	$exists = (int) $wpdb->get_var(
		"SELECT COUNT(*) FROM `" . esc_sql($table_name_escaped) . "`"
	);


	if (0 === $exists) {
		$names  = array(
			'perPage',
			'pro',
			'products_enabled_filters',
			'products_columns_order',
			'products_visible_columns',
			'products_columns_width',
			'coupons_visible_columns',
			'coupons_columns_order',
			'coupons_columns_width',
			'orders_visible_columns',
			'orders_columns_order',
			'orders_columns_width',
			'products_pinned_columns',
			'coupons_pinned_columns',
			'orders_pinned_columns',
		);

		$values = array(
			'100',
			'hello',
			'hello',
			'hello',
			'hello',
			'hello',
			'hello',
			'hello',
			'hello',
			'hello',
			'hello',
			'hello',
			wp_json_encode(array('left' => array('select', 'expand'), 'right' => array())),
			wp_json_encode(array('left' => array('select', 'expand'), 'right' => array())),
			wp_json_encode(array('left' => array('select', 'expand'), 'right' => array())),
		);

		foreach ($names as $i => $name) {
			$wpdb->insert(
				$table_name,
				array(
					'name'         => $name,
					'reservedData' => $values[$i],
				),
				array('%s', '%s')
			);
		}
	}
}

/**
 * Database: create history table if needed.
 */
function whizmanage_create_history_table()
{
	global $wpdb;

	$table_name      = $wpdb->prefix . 'wm_history';
	$charset_collate = $wpdb->get_charset_collate();

	require_once ABSPATH . 'wp-admin/includes/upgrade.php';

	$sql = "CREATE TABLE {$table_name} (
		id INT NOT NULL AUTO_INCREMENT,
		location TEXT NOT NULL,
		user TEXT NOT NULL,
		date DATETIME NOT NULL,
		items LONGTEXT NULL,
		action VARCHAR(32) NULL,
		PRIMARY KEY (id)
	) {$charset_collate};";

	dbDelta($sql);
}

/**
 * Deactivation hook.
 * - Do NOT drop tables here (WordPress.org guideline).
 * - If you need to clear scheduled events/transients, do it here.
 */
function whizmanage_on_deactivation()
{
	// Example: wp_clear_scheduled_hook( 'whizmanage_cron_hook' );
}
register_deactivation_hook(__FILE__, 'whizmanage_on_deactivation');
