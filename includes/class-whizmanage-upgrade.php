<?php
if (! defined('ABSPATH')) exit;

if (! class_exists('Whizmanage_Upgrade')) {

	class Whizmanage_Upgrade
	{

		const OPTION_VERSION    = 'whizmanage_version';
		const OPTION_FORCE_TASK = 'whizmanage_force_task';

		private $table_main;
		private $table_history;

		public function __construct()
		{
			global $wpdb;
			$this->table_main    = $wpdb->prefix . 'whizmanage';
			$this->table_history = $wpdb->prefix . 'wm_history';

			// On first plugin activation – create database tables and store current version.
			register_activation_hook(WHIZMANAGE_FILE, array($this, 'on_activate'));
		}

		/** 
		 * Runs on plugin activation.
		 * Creates or updates database schema and stores the current plugin version.
		 */
		public function on_activate()
		{
			$this->create_or_update_schema();
			update_option(self::OPTION_VERSION, WHIZMANAGE_VERSION);
		}

		/** 
		 * Main entry point.
		 * Handles database migrations, one-time upgrade tasks, and updates the stored version number.
		 */
		public function maybe_run_upgrades()
		{
			$installed = get_option(self::OPTION_VERSION);
			if (! $installed) {
				$this->create_or_update_schema();
				$installed = WHIZMANAGE_VERSION;
				update_option(self::OPTION_VERSION, $installed);
			}

			// Placeholder: add future migrations here if needed, e.g. run_migrations($installed, WHIZMANAGE_VERSION);

			// Run a one-time upgrade task if a flag is set.
			$this->maybe_run_forced_task();

			// Always update the stored version to the latest.
			update_option(self::OPTION_VERSION, WHIZMANAGE_VERSION);
		}

		/** 
		 * Executes a one-time task if a flag is set in the database (via OPTION_FORCE_TASK).
		 */
		protected function maybe_run_forced_task()
		{
			$task = get_option(self::OPTION_FORCE_TASK);
			if (! $task) return;

			switch ($task) {
				case 'seed_defaults':
					$this->migrate_column_names_to_canonical_v1(); // משנה רק name, לא נוגע ב-reservedData
					break;

					// Example for future tasks:
					// case 'rebuild_columns_cache':
					//     $this->task_rebuild_columns_cache();
					//     break;
			}

			// Remove the flag to ensure the task runs only once.
			delete_option(self::OPTION_FORCE_TASK);
		}

		/* ======================== ONE-TIME TASKS ======================== */

		/**
		 * Seeds default records into the main whizmanage table if they don't exist yet.
		 * Idempotent: will not overwrite existing user data.
		 * These are the same default values previously handled via React.
		 */
		/**
		 * Rename only the `name` column to the new canonical keys (do not touch reservedData).
		 * Idempotent via an option flag. Skips if the target name already exists.
		 */
		protected function migrate_column_names_to_canonical_v1()
		{
			global $wpdb;
			$table = $this->table_main;

			$done = get_option('whizmanage_names_canonical_v1');
			if ($done) {
				return;
			}

			$map = array(
				'couponsOrder'    => 'coupons_columns_order',
				'couponsDisplay'  => 'coupons_visible_columns',
				'ordersOrder'     => 'orders_columns_order',
				'ordersDisplay'   => 'orders_visible_columns',
				'columnName'	  => 'products_visible_columns',
				'status' => 'products_enabled_filters',
				'y' => 'products_columns_order',
	
			);


			$allowed_final = array(
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

			foreach ($map as $old => $new) {
				$old = sanitize_text_field($old);
				$new = sanitize_text_field($new);

				$exists_new = (int) $wpdb->get_var(
					$wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE name = %s", $new)
				);
				if ($exists_new > 0) {
					continue;
				}

				$wpdb->update(
					$table,
					array('name' => $new),
					array('name' => $old),
					array('%s'),
					array('%s')
				);
			}

			update_option('whizmanage_names_canonical_v1', 1);
		}


		/* ======================== DATABASE SCHEMA ======================== */

		/**
		 * Creates or updates the required database tables using dbDelta.
		 * Safe to call multiple times.
		 */
		protected function create_or_update_schema()
		{
			global $wpdb;
			require_once ABSPATH . 'wp-admin/includes/upgrade.php';
			$charset = $wpdb->get_charset_collate();

			// Main data table (stores key/value pairs).
			$sql1 = "CREATE TABLE {$this->table_main} (
			id INT NOT NULL AUTO_INCREMENT,
			name TEXT NOT NULL,
			reservedData LONGTEXT NOT NULL,
			PRIMARY KEY (id)
		) {$charset};";

			// History table (if used for activity logs).
			$sql2 = "CREATE TABLE {$this->table_history} (
			id INT NOT NULL AUTO_INCREMENT,
			location TEXT NOT NULL,
			user TEXT NOT NULL,
			date DATETIME NOT NULL,
			items LONGTEXT NULL,
			action VARCHAR(32) NULL,
			PRIMARY KEY (id)
		) {$charset};";

			dbDelta($sql1);
			dbDelta($sql2);
		}
	}
}
