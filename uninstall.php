<?php

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

global $wpdb;

/**
 * Drop WhizManage-specific tables on uninstall.
 *
 * These tables are created by this plugin only and use a clear prefix.
 */
$whizmanage_tables = array(
    $wpdb->prefix . 'whizmanage',
    $wpdb->prefix . 'wm_history',
);

foreach ( $whizmanage_tables as $table_name ) {
    // Static query with a trusted table name (built from $wpdb->prefix).
    $wpdb->query( "DROP TABLE IF EXISTS `{$table_name}`" );
}
