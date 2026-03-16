<?php
if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}
if (!class_exists('Whizmanage_Custom_Fields_Manager')) {
    class Whizmanage_Custom_Fields_Manager
    {
        /**
         * Get all registered fields from ACF, JetEngine, Yoast, etc.
         * returns array
         */
        public static function get_registered_fields_data()
        {
            // Initialize an array to store field data from both ACF and JetEngine
            $field_data_array = array();

            // ------- ACF Integration -------
            if (function_exists('acf')) {
                // Get all ACF field groups
                $field_groups = acf_get_field_groups();

                if ($field_groups) {
                    foreach ($field_groups as $field_group) {
                        $location_matched = false;

                        // Check if any member of the location array meets the conditions
                        if (isset($field_group['location'][0]) && is_array($field_group['location'][0])) {
                            foreach ($field_group['location'][0] as $location_condition) {
                                if (isset($location_condition['param']) && $location_condition['param'] === 'post_type' && isset($location_condition['value']) && $location_condition['value'] === 'product') {
                                    $location_matched = true;
                                    break; // Stop checking once a match is found
                                }
                            }
                        }

                        if ($location_matched) {
                            // Get fields for the current field group

                            $fields = acf_get_fields($field_group);
                            if ($fields) {
                                foreach ($fields as $field) {
                                    $fieldName = esc_html($field['label']);
                                    $fieldKey = esc_html($field['name']);
                                    $fieldDefault = isset($field['default_value']) ? esc_html($field['default_value']) : '';
                                    $fieldType = esc_html($field['type']);
                                    $fieldSelect = isset($field['choices']) ? $field['choices'] : array();
                                    $fieldFormat = isset($field['return_format']) ? esc_html($field['return_format']) : '';

                                    $field_data_array[] = array(
                                        'source' => 'ACF',
                                        'label' => $fieldName,
                                        'key' => $fieldKey,
                                        'value' => $fieldDefault,
                                        'type' => $fieldType,
                                        'format' => $fieldFormat,
                                        'choices' => $fieldSelect
                                    );
                                }
                            }
                        }
                    }
                }
            }

            // ------- JetEngine Integration -------
            if (class_exists('Jet_Engine')) {
                $jet_meta_fields = jet_engine()->meta_boxes->meta_fields;

                if (!empty($jet_meta_fields)) {
                    foreach ($jet_meta_fields as $post_type => $fields) {
                        if ($post_type === 'product') {
                            foreach ($fields as $field) {
                                // Extract fields information
                                $fieldName = esc_html($field['title']);
                                $fieldKey = esc_html($field['name']);
                                $fieldType = esc_html($field['type']);
                                $rawValueFormat = (is_array($field) ? ($field['value_format'] ?? '') : '');
                                $fieldFormat = esc_html((string) $rawValueFormat);
                                $fieldOptions = array();
                                if (isset($field['options']) && is_array($field['options'])) {
                                    foreach ($field['options'] as $option) {
                                        if (isset($option['key'], $option['value'])) {
                                            $fieldOptions[$option['key']] = $option['value'];
                                        }
                                    }
                                }

                                $field_data_array[] = array(
                                    'source' => 'JetEngine',
                                    'label' => $fieldName,
                                    'key' => $fieldKey,
                                    'type' => $fieldType,
                                    "format" => $fieldFormat,
                                    'choices' => $fieldOptions
                                );
                            }
                        }
                    }
                }
            }
            // ------- Yoast SEO Integration -------
            if (defined('WPSEO_VERSION')) {
                $yoast_fields = [
                    [
                        'key' => '_yoast_wpseo_title',
                        'label' => 'SEO Title',
                        'type' => 'text',
                        'help' => 'Title tag shown in search engines. Can override default title.',
                    ],
                    [
                        'key' => '_yoast_wpseo_metadesc',
                        'label' => 'Meta Description',
                        'type' => 'textarea',
                        'help' => 'Description tag shown in search engine results. Helps with click-through rates.',
                    ],
                    [
                        'key' => '_yoast_wpseo_focuskw',
                        'label' => 'Focus Keyword',
                        'type' => 'text',
                        'help' => 'Main keyword or phrase you are targeting for this content.',
                    ],
                    [
                        'key' => '_yoast_wpseo_focuskw_text_input',
                        'label' => 'Focus Keyword (text input)',
                        'type' => 'text',
                        'help' => 'Raw focus keyword field input by user (used internally by Yoast).',
                    ],
                    [
                        'key' => '_yoast_wpseo_canonical',
                        'label' => 'Canonical URL',
                        'type' => 'text',
                        'help' => 'Canonical URL for avoiding duplicate content issues.',
                    ],
                    [
                        'key' => '_yoast_wpseo_meta-robots-noindex',
                        'label' => 'Meta Robots: noindex',
                        'type' => 'switcher',
                        'choices' => ['1' => 'Yes', '0' => 'No'],
                        'help' => 'Prevents the page from being indexed by search engines.',
                    ],
                    [
                        'key' => '_yoast_wpseo_meta-robots-nofollow',
                        'label' => 'Meta Robots: nofollow',
                        'type' => 'switcher',
                        'choices' => ['1' => 'Yes', '0' => 'No'],
                        'help' => 'Prevents search engines from following links on this page.',
                    ],
                    [
                        'key' => '_yoast_wpseo_opengraph-title',
                        'label' => 'Social Title',
                        'type' => 'text',
                        'help' => 'Title shown when sharing the page on social media platforms (e.g., Facebook).',
                    ],
                    [
                        'key' => '_yoast_wpseo_opengraph-description',
                        'label' => 'Social Description',
                        'type' => 'textarea',
                        'help' => 'Description shown on social media (e.g., Facebook) when sharing.',
                    ],
                    [
                        'key' => '_yoast_wpseo_twitter-title',
                        'label' => 'Twitter Title',
                        'type' => 'text',
                        'help' => 'Title used specifically for Twitter cards.',
                    ],
                    [
                        'key' => '_yoast_wpseo_twitter-description',
                        'label' => 'Twitter Description',
                        'type' => 'textarea',
                        'help' => 'Description used specifically for Twitter cards.',
                    ],
                    [
                        'key' => '_yoast_wpseo_breadcrumb_title',
                        'label' => 'Breadcrumb Title',
                        'type' => 'text',
                        'help' => 'Custom breadcrumb title shown in navigational paths.',
                    ],
                    [
                        'key' => '_yoast_wpseo_opengraph-image',
                        'label' => 'Social Image',
                        'type' => 'image',
                        'format' => 'url',
                        'help' => 'Image that will be shown when sharing this content on social platforms (Open Graph / Twitter).',
                    ],
                ];

                foreach ($yoast_fields as $field) {
                    $field_data_array[] = array(
                        'source' => 'Yoast SEO',
                        'label' => $field['label'],
                        'key' => $field['key'],
                        'value' => '',
                        'type' => $field['type'],
                        'format' => $field['format'] ?? '',
                        'choices' => $field['choices'] ?? [],
                        'help' => $field['help'] ?? '',
                    );
                }
            }

            // ------- WhizManage Custom Fields Integration -------
            $whizmanage_fields = get_option('whizmanage_custom_fields', array());
            if (is_string($whizmanage_fields)) {
                $whizmanage_fields = json_decode($whizmanage_fields, true);
                if (!is_array($whizmanage_fields)) {
                    $whizmanage_fields = array();
                }
            }

            foreach ($whizmanage_fields as $field) {
                $field_data_array[] = array(
                    'source'  => 'WhizManage',
                    'label'   => esc_html($field['label'] ?? ''),
                    'key'     => esc_html($field['key'] ?? ''),
                    'value'   => esc_html($field['value'] ?? ''),
                    'type'    => esc_html($field['type'] ?? 'text'),
                    'format'  => esc_html($field['format'] ?? ''),
                    'choices' => $field['choices'] ?? array(),
                    'help'    => esc_html($field['help'] ?? ''),
                );
            }
            return $field_data_array;
        }

        public function custom_fields_collector()
        {
            $field_data_array = self::get_registered_fields_data();

            // Encode as JSON and send to React
            // $jsonAssociativeArray = wp_json_encode($field_data_array);
            wp_add_inline_script(
                'whizmanage-script', // Your handle from enqueue
                'window.WhizManageCustomFields = ' . wp_json_encode($field_data_array) . ';',
                'before'
            );
        }
        /**
         * Collect all meta keys for products (excluding hidden keys).
         */
        public function get_all_product_meta_keys()
        {
            global $wpdb;

            $meta_keys_objects = []; // ✅ initialize

            $meta_keys = $wpdb->get_col(
                "SELECT DISTINCT(meta_key)
         FROM {$wpdb->postmeta} pm
         INNER JOIN {$wpdb->posts} p ON pm.post_id = p.ID
         WHERE p.post_type = 'product'"
            );

            // Fetch registered keys to allow them even if they start with "_"
            $registered_fields = self::get_registered_fields_data();
            $allowed_keys = array_column($registered_fields, 'key');

            foreach ($meta_keys as $key) {
                if (!is_string($key)) {
                    continue;
                }

                $key = trim($key);

                // Allow if it's explicitly allowed OR (not empty AND not standard hidden)
                // Logic: if key is in allowed_keys, we skip the underscore check.
                if ($key === '' || $key === 'total_sales') {
                    continue;
                }
                
                // If it starts with _ AND it is NOT in the allowed list, skip it.
                if ($key[0] === '_' && !in_array($key, $allowed_keys, true)) {
                    continue;
                }

                $meta_keys_objects[] = ['key' => $key];
            }

            wp_add_inline_script(
                'whizmanage-script',
                'window.metaKey = ' . wp_json_encode($meta_keys_objects) . ';',
                'before'
            );
        }
    }
}
