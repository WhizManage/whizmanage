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

foreach ( $whizmanage_tables as $whizmanage_table_name ) {
    $whizmanage_table_name = esc_sql( $whizmanage_table_name );

    $wpdb->query( "DROP TABLE IF EXISTS `{$whizmanage_table_name}`" );
}
