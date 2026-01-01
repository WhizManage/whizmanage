<?php

if (!class_exists('Whizmanage_get_product')) {
    class Whizmanage_get_product
    {
        public function get_products($product_ids = array(), $offset = 0, $limit = 1500, $filters = [])
        {
            $search = isset($filters['search']) ? trim((string) $filters['search']) : null;
            $status = !empty($filters['status']) ? (array) $filters['status'] : array('publish', 'draft', 'pending', 'future', 'private');
            $type = !empty($filters['type']) ? (array) $filters['type'] : [];
            $downloadable = isset($filters['downloadable']) ? $filters['downloadable'] : null;
            $product_cat = !empty($filters['product_cat']) ? (array) $filters['product_cat'] : [];
            $product_tag = !empty($filters['product_tag']) ? (array) $filters['product_tag'] : [];
            $tax_filters = !empty($filters['tax_filters']) && is_array($filters['tax_filters']) ? $filters['tax_filters'] : [];

            // Query basis
            $args = array(
                'post_type' => 'product',
                'posts_per_page' => $limit,
                'post_status' => $status,
                'offset' => $offset,
                'orderby' => array('menu_order' => 'ASC', 'date' => 'DESC', 'ID' => 'ASC'),
                'no_found_rows' => false, // To allow found_posts when needed
            );

            if (!empty($product_ids)) {
                $args['post__in'] = $product_ids;
            }

            // ===== Search: text (title/content), SKU, and also direct LIKE on title =====
            $title_like_filter = null;
            if ($search !== null && $search !== '') {
                global $wpdb;

                $like = '%' . $wpdb->esc_like($search) . '%';

                // 1. Search by product name (post_title)
                $title_match_ids = $wpdb->get_col(
                    $wpdb->prepare("
            SELECT ID 
            FROM {$wpdb->posts}
            WHERE post_type = 'product'
              AND post_title LIKE %s
        ", $like)
                );

                // 2. Search by SKU in postmeta table
                $sku_match_ids = $wpdb->get_col(
                    $wpdb->prepare("
            SELECT post_id 
            FROM {$wpdb->postmeta}
            WHERE meta_key = '_sku'
              AND meta_value LIKE %s
        ", $like)
                );

                // 3. Search also in variations, and add only parents (if you still want this)
                $variation_ids = $wpdb->get_col(
                    $wpdb->prepare("
            SELECT ID 
            FROM {$wpdb->posts}
            WHERE post_type = 'product_variation'
              AND post_title LIKE %s
        ", $like)
                );

                $parent_ids = array();
                if (!empty($variation_ids)) {
                    $parent_ids = array_unique(array_filter(array_map(function ($vid) {
                        return (int) get_post_field('post_parent', $vid);
                    }, $variation_ids)));
                }

                // 4. Merge all IDs related to search
                $search_post_in = array();

                // 4.1 Check if search is a number (Product ID)
                if (is_numeric($search)) {
                    $product_id = (int) $search;
                    $product_exists = $wpdb->get_var(
                        $wpdb->prepare("
                            SELECT ID 
                            FROM {$wpdb->posts}
                            WHERE ID = %d
                              AND post_type = 'product'
                        ", $product_id)
                    );
                    if ($product_exists) {
                        $search_post_in[] = $product_id;
                    }
                }

                if (!empty($title_match_ids)) {
                    $search_post_in = array_merge($search_post_in, $title_match_ids);
                }
                if (!empty($sku_match_ids)) {
                    $search_post_in = array_merge($search_post_in, $sku_match_ids);
                }
                if (!empty($parent_ids)) {
                    $search_post_in = array_merge($search_post_in, $parent_ids);
                }

                // If post__in already exists (e.g. from filtering by IDs) - merge
                if (!empty($search_post_in)) {
                    $search_post_in = array_values(array_unique(array_map('intval', $search_post_in)));

                    if (isset($args['post__in']) && !empty($args['post__in'])) {
                        $args['post__in'] = array_values(array_unique(array_map('intval', array_merge(
                            (array) $args['post__in'],
                            $search_post_in
                        ))));
                    } else {
                        $args['post__in'] = $search_post_in;
                    }
                } else {
                    // If no matches found at all – ensure nothing is returned
                    $args['post__in'] = array(0);
                }

                // Not using $args['s'] at all
                // And not old posts_where filter – can delete entire add_filter / remove_filter section
            }



            // ===== meta_query for additional filters =====
            $meta_query = isset($args['meta_query']) ? $args['meta_query'] : array('relation' => 'AND');

            if ($downloadable === 'yes' || $downloadable === 'no') {
                $meta_query[] = array(
                    'key' => '_downloadable',
                    'value' => $downloadable === 'yes' ? 'yes' : 'no',
                    'compare' => '=',
                );
            }
            if (count($meta_query) > 1) {
                $args['meta_query'] = $meta_query;
            }

            // ===== tax_query (categories / tags / type / additional taxonomies) =====
            $tax_query = array('relation' => 'AND');

            if (!empty($product_cat)) {
                $tax_query[] = array(
                    'taxonomy' => 'product_cat',
                    'field' => 'term_id',
                    'terms' => array_map('intval', $product_cat),
                );
            }
            if (!empty($product_tag)) {
                $tax_query[] = array(
                    'taxonomy' => 'product_tag',
                    'field' => 'term_id',
                    'terms' => array_map('intval', $product_tag),
                );
            }
            if (!empty($type)) {
                $tax_query[] = array(
                    'taxonomy' => 'product_type',
                    'field' => 'slug',
                    'terms' => array_map('sanitize_title', $type),
                );
            }
            if (!empty($tax_filters)) {
                foreach ($tax_filters as $taxonomy => $term_ids) {
                    $taxonomy = ltrim(urldecode($taxonomy), '_');
                    if (!taxonomy_exists($taxonomy))
                        continue;
                    $tax_query[] = array(
                        'taxonomy' => $taxonomy,
                        'field' => 'term_id',
                        'terms' => array_map('intval', (array) $term_ids),
                    );
                }
            }
            if (count($tax_query) > 1) {
                $args['tax_query'] = $tax_query;
            }

            // ===== Run query =====
            $products_query = new WP_Query($args);

            // Clear filter if defined
            if ($title_like_filter) {
                remove_filter('posts_where', $title_like_filter, 10);
            }

            if ($products_query->have_posts()) {
                $products = array();

                while ($products_query->have_posts()) {
                    $products_query->the_post();
                    // תמיד נטען את המוצר לפי ה־post ID
                    $product = wc_get_product(get_the_ID());
                    if (!$product) {
                        continue;
                    }

                    // לדלג על ווריאציות – אנחנו רוצים רק את המוצר האב בחיפוש
                    if ($product->is_type('variation')) {
                        // אם בעתיד תרצה במקום לדלג לטעון את האבא, אפשר:
                        // $parent_id = $product->get_parent_id();
                        // if ($parent_id) {
                        //     $product = wc_get_product($parent_id);
                        // } else {
                        //     continue;
                        // }
                        continue;
                    }

                    try {
                        $product_data = (array) $product->get_data();
                    } catch (Exception $e) {
                        continue;
                    }

                    // Handle product categories
                    try {
                        $product_categories = array();
                        $terms = wp_get_post_terms(get_the_ID(), 'product_cat');
                        foreach ($terms as $term) {
                            $product_categories[] = array(
                                'id' => $term->term_id,
                                'name' => $term->name,
                                'slug' => $term->slug,
                                'parent' => $term->parent
                            );
                        }
                        $product_data['categories'] = $product_categories;
                    } catch (Exception $e) {

                        $product_data['categories'] = [];
                    }

                    // Handle product images
                    try {
                        $product_images = array();
                        $attachment_ids = $product->get_gallery_image_ids();
                        if (!empty($product->get_image_id())) {
                            foreach ($attachment_ids as $attachment_id) {
                                $image = wp_get_attachment_image_src($attachment_id, 'full');
                                $product_images[] = array(
                                    'id' => $attachment_id,
                                    'src' => $image[0],
                                    'name' => basename($image[0]),
                                    'alt' => get_post_meta($attachment_id, '_wp_attachment_image_alt', true),
                                );
                            }
                            $image_id = $product->get_image_id();
                            if ($image_id && !in_array($image_id, array_column($product_images, 'id'))) {
                                $image = wp_get_attachment_image_src($image_id, 'full');
                                array_unshift($product_images, array(
                                    'id' => (int) $image_id,
                                    'src' => $image[0],
                                    'name' => basename($image[0]),
                                    'alt' => get_post_meta($image_id, '_wp_attachment_image_alt', true),
                                ));
                            }
                        } else {
                            $product_images[] = array(); // Placeholder
                        }
                        $product_data['images'] = $product_images;
                    } catch (Exception $e) {

                        $product_data['images'] = [];
                    }

                    try {
                        $product_attributes = array();
                        $attributes = $product->get_attributes();

                        foreach ($attributes as $attribute) {
                            try {

                                $attribute_data = $attribute->get_data();
                                $options = array();

                                if ($attribute_data['id'] == 0) {

                                    foreach ($attribute_data['options'] as $option) {
                                        $options[] = $option;
                                    }

                                    $name = $attribute_data['name'];
                                    $slug = isset($attribute_data['slug']) ? $attribute_data['slug'] : sanitize_title($name);
                                    $label = wc_attribute_label($slug);
                                } else {

                                    foreach ($attribute_data['options'] as $option_id) {
                                        $term = get_term($option_id);
                                        if (!is_wp_error($term) && $term && isset($term->name)) {
                                            $options[] = $term->name;
                                        }
                                    }

                                    $slug = $attribute_data['name'];
                                    $label = wc_attribute_label($slug);
                                    $name = $label;
                                }

                                $product_attributes[] = array(
                                    'id' => $attribute_data['id'],
                                    'name' => $name,
                                    'slug' => $slug,
                                    'position' => isset($attribute_data['position']) ? $attribute_data['position'] : 0,
                                    'visible' => isset($attribute_data['visible']) ? $attribute_data['visible'] : false,
                                    'variation' => isset($attribute_data['variation']) ? $attribute_data['variation'] : false,
                                    'options' => $options,
                                );
                            } catch (Exception $e) {

                                continue;
                            }
                        }

                        $product_data['attributes'] = $product_attributes;
                    } catch (Exception $e) {

                        $product_data['attributes'] = [];
                    }


                    // Handle product tags
                    try {
                        $product_tags = array();
                        $tags = wp_get_post_terms(get_the_ID(), 'product_tag');
                        foreach ($tags as $tag) {
                            $product_tags[] = array(
                                'id' => $tag->term_id,
                                'name' => $tag->name,
                                'slug' => $tag->slug,
                            );
                        }
                        $product_data['tags'] = $product_tags;
                    } catch (Exception $e) {

                        $product_data['tags'] = [];
                    }

                    $product_data['dimensions'] = array(
                        'length' => $product_data['length'],
                        'width' => $product_data['width'],
                        'height' => $product_data['height'],
                    );

  
                    if (method_exists($product, 'get_meta_data')) {
                        $meta_data = [];
                        $product_meta_data = $product->get_meta_data();

                        // מפתחות Yoast שהם טקסט טהור (להשאיר כמחרוזת אחת)
                        $yoast_text_keys = [
                            '_yoast_wpseo_title',
                            '_yoast_wpseo_metadesc',
                            '_yoast_wpseo_focuskw',
                            '_yoast_wpseo_focuskw_text_input',
                            '_yoast_wpseo_canonical',
                            '_yoast_wpseo_meta-robots-noindex',
                            '_yoast_wpseo_meta-robots-nofollow',
                            '_yoast_wpseo_opengraph-title',
                            '_yoast_wpseo_opengraph-description',
                            '_yoast_wpseo_twitter-title',
                            '_yoast_wpseo_twitter-description',
                            '_yoast_wpseo_breadcrumb_title',
                            '_yoast_wpseo_primary_product_cat',
                            '_yoast_wpseo_primary_product_brand',
                            '_yoast_wpseo_linkdex',
                            // שים לב: בכוונה לא הכנסתי פה את _yoast_wpseo_opengraph-image
                        ];

                        // מפתח Yoast יחיד שהוא תמונה (מדיה)
                        $yoast_og_image_key = '_yoast_wpseo_opengraph-image';

                        // מפתחות שבהם הגיוני לפצל לפי פסיקים (למשל גלריה/רשימות) — עדכן לפי הפרויקט שלך
                        $comma_list_keys = [
                            '_product_image_gallery',
                            'gallery',
                            'wm_gallery',
                            // הוסף כאן רק מפתחות שאתה יודע בוודאות שהם רשימות
                        ];

            // Fetch registered keys to allow them even if they start with "_"
            $allowed_keys = [];
            $field_types = [];
            if (class_exists('Whizmanage_Custom_Fields_Manager') && method_exists('Whizmanage_Custom_Fields_Manager', 'get_registered_fields_data')) {
                $registered_fields = Whizmanage_Custom_Fields_Manager::get_registered_fields_data();
                $allowed_keys = array_column($registered_fields, 'key');
                foreach ($registered_fields as $field) {
                    $field_types[$field['key']] = $field['type'] ?? '';
                }
            }

            foreach ($product_meta_data as $meta) {
                // דילוג על מפתחות פרטיים לא-יוסט
                // אם מתחיל ב _ וגם לא יוסט וגם לא ברשימת המותרים
                if (strpos($meta->key, '_') === 0) {
                     $is_yoast = defined('WPSEO_VERSION') && (in_array($meta->key, $yoast_text_keys, true) || $meta->key === $yoast_og_image_key);
                     $is_allowed = in_array($meta->key, $allowed_keys, true);

                     if (!$is_yoast && !$is_allowed) {
                         continue;
                     }
                }

                $processed_value = $meta->value;
                $current_field_type = $field_types[$meta->key] ?? '';

                            // טיפול ביוסט – טקסטים
                            if (in_array($meta->key, $yoast_text_keys, true)) {
                                // קטגוריה/מותג פריימרי – אם הגיע כמספר, להמיר לשם הטרם
                                if (in_array($meta->key, ['_yoast_wpseo_primary_product_cat', '_yoast_wpseo_primary_product_brand'], true) && is_numeric($processed_value)) {
                                    $term = get_term((int) $processed_value);
                                    if ($term && !is_wp_error($term)) {
                                        $processed_value = $term->name;
                                    } else {
                                        $processed_value = (string) $processed_value; // fallback
                                    }
                                } else {
                                    // וידוא מחרוזת – אם בטעות נשמר מערך, לשטח למחרוזת אחת
                                    if (is_array($processed_value)) {
                                        $processed_value = trim(implode(' ', array_map(function ($v) {
                                            if (is_string($v))
                                                return $v;
                                            if (is_array($v) && array_key_exists('url', $v))
                                                return (string) $v['url'];
                                            return is_scalar($v) ? (string) $v : '';
                                        }, $processed_value)));
                                    } else {
                                        $processed_value = is_scalar($processed_value) ? trim((string) $processed_value) : '';
                                    }
                                }

                                // טיפול בתמונת OpenGraph של יוסט – כמדיה יחידה
                            } elseif ($meta->key === $yoast_og_image_key) {
                                if (is_numeric($processed_value) && wp_attachment_is_image((int) $processed_value)) {
                                    $processed_value = [
                                        'id' => (int) $processed_value,
                                        'url' => wp_get_attachment_url((int) $processed_value) ?: '',
                                    ];
                                } elseif (is_string($processed_value) && filter_var($processed_value, FILTER_VALIDATE_URL)) {
                                    $attachment_id = attachment_url_to_postid($processed_value);
                                    if ($attachment_id && wp_attachment_is_image($attachment_id)) {
                                        $processed_value = [
                                            'id' => (int) $attachment_id,
                                            'url' => $processed_value,
                                        ];
                                    } else {
                                        // עדיין להשאיר כאובייקט מדיה אחיד
                                        $processed_value = [
                                            'id' => null,
                                            'url' => $processed_value,
                                        ];
                                    }
                                } else {
                                    // אם זה לא מזהה/URL, שמור כמחרוזת כדי לא לשבור סכימה
                                    $processed_value = is_scalar($processed_value) ? (string) $processed_value : '';
                                }

                                // כל שאר המפתחות (לא יוסט) – לוגיקת ברירת מחדל
                            } else {
                                if (is_string($processed_value)) {
                                    // פיצול לפי פסיקים מותר רק למפתחות המוגדרים כרשימה
                                    if (in_array($meta->key, $comma_list_keys, true) && strpos($processed_value, ',') !== false) {
                                        $items = array_map('trim', explode(',', $processed_value));
                                        $processed_value = array_map(function ($item) {
                                            if ($item === '') {
                                                return ['id' => null, 'url' => ''];
                                            }
                                            if (is_numeric($item) && wp_attachment_is_image((int) $item)) {
                                                return [
                                                    'id' => (int) $item,
                                                    'url' => wp_get_attachment_url((int) $item) ?: '',
                                                ];
                                            }
                                            if (filter_var($item, FILTER_VALIDATE_URL)) {
                                                $attachment_id = attachment_url_to_postid($item);
                                                if ($attachment_id && wp_attachment_is_image($attachment_id)) {
                                                    return [
                                                        'id' => (int) $attachment_id,
                                                        'url' => $item,
                                                    ];
                                                }
                                                return [
                                                    'id' => null,
                                                    'url' => $item,
                                                ];
                                            }
                                            // עבור רשימות טקסטואליות – שמור כערך plain בתוך שדה url לשמירה על סכימת ה-UI שלך
                                            return ['id' => null, 'url' => $item];
                                        }, $items);

                                        // מזהה יחיד של תמונה
                                    } elseif (is_numeric($processed_value)) {
                                        // Only convert to image if we DON'T know it's a non-image type
                                        // OR if we explicitly know it's an image/gallery type
                                        $should_check_image = true;
                                        
                                        // Types that should NEVER be treated as image IDs even if the number matches an attachment
                                        $non_image_types = ['text', 'number', 'range', 'textarea', 'email', 'url', 'password', 'select', 'radio', 'true_false', 'checkbox'];

                                        if (in_array($current_field_type, $non_image_types, true)) {
                                            $should_check_image = false;
                                        }

                                        if ($should_check_image && wp_attachment_is_image((int) $processed_value)) {
                                            $processed_value = [
                                                'id' => (int) $processed_value,
                                                'url' => wp_get_attachment_url((int) $processed_value) ?: '',
                                            ];
                                        }

                                        // URL יחיד – ננסה למצוא מזהה תמונה
                                    } elseif (filter_var($processed_value, FILTER_VALIDATE_URL)) {
                                        $attachment_id = attachment_url_to_postid($processed_value);
                                        if ($attachment_id && wp_attachment_is_image($attachment_id)) {
                                            $processed_value = [
                                                'id' => (int) $attachment_id,
                                                'url' => $processed_value,
                                            ];
                                        } else {
                                            // השאר כ-string רגיל, אל תהפוך למדיה ללא סיבה
                                            $processed_value = $processed_value;
                                        }
                                    }
                                }
                            }

                            $meta_data[] = [
                                "id" => $meta->id,
                                "key" => $meta->key,
                                "value" => $processed_value,
                            ];
                        }
                    }

                    $product_data['meta_data'] = $meta_data;
                    // Add backordered, permalink, variations, price_html, type, and _links
                    $product_data['shipping_class'] = urldecode($product->get_shipping_class());
                    $product_data['shipping_required'] = $product->needs_shipping();
                    $product_data['shipping_taxable'] = $product->is_shipping_taxable();
                    $product_data['featured'] = $product->is_featured();
                    $product_data['title'] = $product->get_name();
                    $product_data['date_created_gmt'] = $product->get_date_created() ? $product->get_date_created()->date('Y-m-d\TH:i:s\Z') : null;
                    $product_data['date_modified'] = $product->get_date_modified() ? $product->get_date_modified()->date('Y-m-d\TH:i:s') : null;
                    $product_data['date_modified_gmt'] = $product->get_date_modified() ? $product->get_date_modified()->date('Y-m-d\TH:i:s\Z') : null;
                    $product_data['date_on_sale_from'] = $product->get_date_on_sale_from() ? $product->get_date_on_sale_from()->date('Y-m-d\TH:i:s') : null;
                    $product_data['date_on_sale_from_gmt'] = $product->get_date_on_sale_from() ? $product->get_date_on_sale_from()->date('Y-m-d\TH:i:s\Z') : null;
                    $product_data['date_on_sale_to'] = $product->get_date_on_sale_to() ? $product->get_date_on_sale_to()->date('Y-m-d\TH:i:s') : null;
                    $product_data['date_on_sale_to_gmt'] = $product->get_date_on_sale_to() ? $product->get_date_on_sale_to()->date('Y-m-d\TH:i:s\Z') : null;
                    $product_data['backordered'] = $product->is_on_backorder();
                    $product_data['backorders_allowed'] = $product->backorders_allowed();
                    $product_data['button_text'] = $product->add_to_cart_text();
                    $product_data['permalink'] = get_permalink(get_the_ID());
                    $product_data['variations'] = $product->get_children();
                    $product_data['price_html'] = $product->get_price_html();
                    $product_data['type'] = $product->get_type();

                    if ($product_data['low_stock_amount'] == "") {
                        $product_data['low_stock_amount'] = null;
                    }

                    $product_data['has_options'] = !empty($product_data['variations']) ? true : false;

                    $product_downloads = array();
                    $downloads = $product->get_downloads();
                    foreach ($downloads as $download) {
                        $download_data = array(
                            'id' => $download['id'],
                            'name' => $download['name'],
                            'file' => $download['file'],
                        );
                        $product_downloads[] = $download_data;
                    }
                    $product_data['downloads'] = $product_downloads;

                    $product_data['slug'] = urldecode($product_data['slug']);
                    $product_data['subRows'] = $this->get_variations($product_data["id"]);

                    // Retrieve product custom taxonomies
                    $taxonomies = get_object_taxonomies('product', 'names');

                    $default_taxonomies = array(
                        'product_cat',
                        'product_tag',
                        'product_shipping_class',
                        'product_type'
                    );

                    foreach ($taxonomies as $taxonomy) {

                        if (in_array($taxonomy, $default_taxonomies)) {
                            continue;
                        }

                        $terms = wp_get_post_terms(get_the_ID(), $taxonomy);

                        $taxonomy_terms = array();

                        if (!empty($terms) && !is_wp_error($terms)) {
                            foreach ($terms as $term) {
                                $taxonomy_terms[] = array(
                                    'id' => $term->term_id,
                                    'name' => $term->name,
                                    'slug' => urldecode($term->slug),
                                );
                            }
                        }

                        $product_data['_' . $taxonomy] = $taxonomy_terms;
                    }

                    unset($product_data["date_created"]);
                    unset($product_data["image_id"]);
                    unset($product_data["height"]);
                    unset($product_data["length"]);
                    unset($product_data["width"]);
                    unset($product_data["category_ids"]);
                    unset($product_data["rating_counts"]);
                    unset($product_data["gallery_image_ids"]);
                    unset($product_data["default_attributes"]);
                    // Add product data to products array
                    $products[] = $product_data;
                }


                // Convert products array to JSON
                $jsonListProduct = wp_json_encode($products);

                // Output JSON

            } else {
                $jsonListProduct = wp_json_encode([]);
            }

            // Restore original post data
            wp_reset_postdata();

            return $jsonListProduct;
        }

        public function get_variations($product_id)
        {
            $product = wc_get_product($product_id);

            if ($product->is_type('variable')) {
                $variation_ids    = $product->get_children();
                $variations_array = array();

                foreach ($variation_ids as $variation_id) {
                    $variation       = new WC_Product_Variation($variation_id);
                    $attributes      = $variation->get_attributes();
                    $attribute_data  = array();
                    $variation_name  = $product->get_name() . ' - ';

                    foreach ($attributes as $raw_key => $raw_value) {
                        $value      = urldecode($raw_value);
                        $attr_key   = $raw_key;
                        $is_global  = false;
                        $clean_name = $raw_key;

                        if (strpos($raw_key, 'attribute_') === 0) {
                            $clean_name = substr($raw_key, 10);
                            $is_global  = false;
                        } elseif (strpos($raw_key, 'pa_') === 0) {
                            $clean_name = substr($raw_key, 3);
                            $is_global  = true;
                        } else {
                            $product_attributes = $product->get_attributes();
                            if (isset($product_attributes[$raw_key])) {
                                $is_global = $product_attributes[$raw_key]->is_taxonomy();
                                if ($is_global && strpos($raw_key, 'pa_') !== 0) {
                                    $attr_key   = 'pa_' . $raw_key;
                                    $clean_name = $raw_key;
                                }
                            } else {
                                $is_global = false;
                            }
                        }

                        if ($is_global) {
                            $attribute_id     = wc_attribute_taxonomy_id_by_name($clean_name);
                            $attribute_object = $attribute_id ? wc_get_attribute($attribute_id) : null;
                            $attribute_label  = $attribute_object ? $attribute_object->name : wc_attribute_label($attr_key);
                            $slug             = $attr_key;

                            // Get the term name from slug for global attributes
                            // Build the correct taxonomy name (must start with pa_)
                            $taxonomy_name = strpos($attr_key, 'pa_') === 0 ? $attr_key : 'pa_' . $attr_key;

                            // Try to get term by slug first, then by name if that fails
                            $term = get_term_by('slug', $value, $taxonomy_name);
                            if (!$term || is_wp_error($term)) {
                                // Maybe $value is already the name, try by name
                                $term = get_term_by('name', $value, $taxonomy_name);
                            }
                            $option_display = ($term && !is_wp_error($term)) ? $term->name : $value;

                            $base_data = array(
                                'id'     => (int) $attribute_id,
                                'name'   => $attribute_label,
                                'slug'   => urldecode($slug),   // pa_color
                                'option' => $option_display,
                            );

                            $variation_name .= $attribute_label . ': ' . $option_display . ' ';
                        } else {
                            $pretty_label = ucwords(str_replace(array('-', '_'), ' ', $clean_name));
                            $slug         = sanitize_title($clean_name);

                            $base_data = array(
                                'id'     => 0,
                                'name'   => urldecode($pretty_label),
                                'option' => $value,
                            );

                            $variation_name .= $pretty_label . ': ' . $value . ' ';
                        }

                        $attribute_data[] = $base_data;
                    }



                    // Get variation dimensions
                    $dimensions = array(
                        "length" => $variation->get_length(),
                        "width" => $variation->get_width(),
                        "height" => $variation->get_height()
                    );

                    // Get variation image data
                    $image_id = $variation->get_image_id();
                    $image_data = wp_get_attachment_image_src($image_id, 'full');
                    $image_src = isset($image_data[0]) ? $image_data[0] : '';
                    $image_name = get_the_title($image_id);
                    $image_alt = get_post_meta($image_id, '_wp_attachment_image_alt', true);
                    $image_date_created = get_the_date('Y-m-d\TH:i:s', $image_id);
                    $image_date_modified = get_the_modified_date('Y-m-d\TH:i:s', $image_id);
                    try {
                        $download_limit = method_exists($variation, 'get_download_limit') ? $variation->get_download_limit() : null;
                        $download_expiry = method_exists($variation, 'get_download_expiry') ? $variation->get_download_expiry() : null;

                        $shipping_class_id = method_exists($variation, 'get_shipping_class_id') ? $variation->get_shipping_class_id() : null;
                        $shipping_class = method_exists($variation, 'get_shipping_class') ? $variation->get_shipping_class() : null;

                        $purchasable = method_exists($variation, 'is_purchasable') ? $variation->is_purchasable() : false;
                        $permalink = method_exists($variation, 'get_permalink') ? $variation->get_permalink() : null;

                        $meta_data = [];
                        if (method_exists($variation, 'get_meta_data')) {
                            $variation_meta_data = $variation->get_meta_data();
                            foreach ($variation_meta_data as $meta) {
                                $meta_data[] = array(
                                    "id" => $meta->id,
                                    "key" => $meta->key,
                                    "value" => $meta->value
                                );
                            }
                        }
                    } catch (Exception $e) {
                    }

                    // Get additional variation attributes
                    $sku = $variation->get_sku();
                    $price = $variation->get_price();
                    $regular_price = $variation->get_regular_price();
                    $sale_price = $variation->get_sale_price();
                    $status = $variation->get_status();
                    $stock_quantity = $variation->get_stock_quantity();
                    $stock_status = $variation->get_stock_status();
                    $virtual = $variation->get_virtual();
                    $parent_id = $variation->get_parent_id();
                    $weight = $variation->get_weight();
                    $tax_status = $variation->get_tax_status();
                    $tax_class = $variation->get_tax_class();
                    $permalink = $variation->get_permalink();
                    $on_sale = $variation->is_on_sale();
                    $menu_order = $variation->get_menu_order();
                    $manage_stock = $variation->get_manage_stock();
                    $low_stock_amount = $variation->get_low_stock_amount();
                    if ($low_stock_amount == "") {
                        $low_stock_amount = null;
                    }
                    $variation_downloads = array();
                    $downloads = $variation->get_downloads();
                    foreach ($downloads as $download) {
                        $download_data = array(
                            'id' => $download['id'],
                            'name' => $download['name'],
                            'file' => $download['file'],
                        );
                        $variation_downloads[] = $download_data;
                    }
                    $downloadable = $variation->is_downloadable();
                    $description = $variation->get_description();
                    $date_on_sale_to_gmt = $variation->get_date_on_sale_to() ? $variation->get_date_on_sale_to()->date('Y-m-d\TH:i:s\Z') : null;;
                    $date_on_sale_from_gmt = $variation->get_date_on_sale_from() ? $variation->get_date_on_sale_from()->date('Y-m-d\TH:i:s\Z') : null;
                    $date_on_sale_to = $variation->get_date_on_sale_to() ? $variation->get_date_on_sale_to()->date('Y-m-d\TH:i:s\Z') : null;
                    $date_on_sale_from = $variation->get_date_on_sale_from() ? $variation->get_date_on_sale_from()->date('Y-m-d\TH:i:s') : null;
                    $date_modified_gmt = $variation->get_date_modified() ? $variation->get_date_modified()->date('Y-m-d\TH:i:s\Z') : null;
                    $date_created_gmt = $variation->get_date_created() ? $variation->get_date_created()->date('Y-m-d\TH:i:s\Z') : null;

                    $date_created = $variation->get_date_created() ? $variation->get_date_created()->date('Y-m-d\TH:i:s') : null;
                    $date_modified = $variation->get_date_modified() ? $variation->get_date_modified()->date('Y-m-d\TH:i:s') : null;
                    $global_unique_id = $variation->get_global_unique_id() ? $variation->get_global_unique_id() : "";

                    $variation_data = array(
                        "id" => $variation_id,
                        "name" => urldecode($variation_name), // Updated name attribute
                        "attributes" => $attribute_data,
                        "dimensions" => $dimensions, // Adding dimensions attribute
                        "image" => $image_id != 0 ? array(
                            "id" => $image_id,
                            "date_created" => $image_date_created,
                            "date_created_gmt" => get_post_time('Y-m-d\TH:i:s', true, $image_id, true),
                            "date_modified" => $image_date_modified,
                            "date_modified_gmt" => get_post_modified_time('Y-m-d\TH:i:s', true, $image_id, true),
                            "src" => $image_src,
                            "name" => $image_name,
                            "alt" => $image_alt
                        ) : null,
                        "meta_data" => $meta_data, // Adding meta_data attribute
                        "sku" => $sku,
                        "price" => $price,
                        "regular_price" => $regular_price,
                        "sale_price" => $sale_price,
                        "status" => $status,
                        "stock_quantity" => $stock_quantity,
                        "stock_status" => $stock_status,
                        "virtual" => $virtual,
                        "parent_id" => $parent_id,
                        "weight" => $weight,
                        "tax_status" => $tax_status,
                        "tax_class" => $tax_class,
                        "shipping_class_id" => $shipping_class_id,
                        "shipping_class" => urldecode($shipping_class),
                        "global_unique_id" => $global_unique_id,
                        "purchasable" => $purchasable,
                        "permalink" => $permalink,
                        "on_sale" => $on_sale,
                        "menu_order" => $menu_order,
                        "manage_stock" => $manage_stock,
                        "low_stock_amount" => $low_stock_amount,
                        "downloads" => $variation_downloads,
                        "downloadable" => $downloadable,
                        "download_limit" => $download_limit,
                        "download_expiry" => $download_expiry,
                        "description" => $description,
                        "date_on_sale_to_gmt" => $date_on_sale_to_gmt,
                        "date_on_sale_from_gmt" => $date_on_sale_from_gmt,
                        "date_on_sale_to" => $date_on_sale_to,
                        "date_on_sale_from" => $date_on_sale_from,
                        "date_created" => $date_created,
                        "date_created_gmt" => $date_created_gmt,
                        "date_modified" => $date_modified,
                        "date_modified_gmt" => $date_modified_gmt
                    );

                    $variations_array[] = $variation_data;
                }
                return $variations_array;
            }

            return array(); // Return empty array if product is not variable
        }

        public function check_attributes_variation($attributes)
        {
            $count_product = 0;
            $count_global = 0;

            foreach ($attributes as $attribute_name => $attribute_value) {
                $attribute_id = wc_attribute_taxonomy_id_by_name($attribute_name);
                if ($attribute_id != 0) {
                    $count_global++;
                } else {
                    $count_product++;
                }
            }

            if ($count_product > 0 && $count_global > 0) {
                return 0;
            } else {
                return 1;
            }
        }
        public function count_all_products()
        {
            $args = array(
                'post_type' => 'product',
                'post_status' => array('publish', 'draft', 'pending', 'future', 'private'),
                'posts_per_page' => -1, // טוען את כל המוצרים ללא הגבלה
                'fields' => 'ids', // שומר רק את המזהים כדי לחסוך זיכרון
            );

            $query = new WP_Query($args);

            return $query->found_posts; // מחזיר את מספר המוצרים
        }

        public function get_products_for_coupons($product_ids = array(), $offset = 0, $limit = 1500)
        {
            $args = array(
                'post_type' => 'product',
                'posts_per_page' => $limit,
                'post_status' => array('publish', 'draft', 'pending', 'future', 'private'),
                'offset' => $offset,
            );

            if (!empty($product_ids)) {
                $args['post__in'] = $product_ids;
            }

            $products_query = new WP_Query($args);
            $products = array();

            if ($products_query->have_posts()) {
                while ($products_query->have_posts()) {
                    $products_query->the_post();
                    global $product;

                    try {
                        $product_id = $product->get_id();
                        $product_name = $product->get_name();
                        $variations = $this->get_variations_for_coupons($product_id);
                        $thumbnail_id = $product->get_image_id();
                        $image_url = wp_get_attachment_url($thumbnail_id);
                        $final_price = $product->get_price();
                        $regular_price = $product->get_regular_price();
                        $sale_price = $product->get_sale_price();

                        // ✅ מה שאתה צריך בשביל ה־"In stock"
                        $stock_status = $product->get_stock_status();
                        $stock_quantity = $product->get_stock_quantity(); // אופציונלי

                        $products[] = array(
                            'id' => $product_id,
                            'name' => $product_name,
                            'price' => $final_price,
                            'regular_price' => $regular_price,
                            'sale_price' => $sale_price,
                            'image' => $image_url,
                            'subRows' => $variations,
                            'stock_status' => $stock_status,   // ✅ מזה נוצרת הכתובת "In stock" בצד React
                            'stock_qty' => $stock_quantity, // אם תרצה להציג כמות
                        );
                    } catch (Exception $e) {
                        continue;
                    }
                }
            }

            wp_reset_postdata();

            return wp_json_encode($products);
        }


        public function get_variations_for_coupons($product_id)
        {
            $product = wc_get_product($product_id);

            if ($product->is_type('variable')) {
                // קבלת מזהי כל הווריאציות
                $variation_ids = $product->get_children();
                $variations_array = array();

                foreach ($variation_ids as $variation_id) {
                    $variation = new WC_Product_Variation($variation_id);

                    // בניית שם הווריאציה
                    $attributes = $variation->get_attributes();
                    $variation_name = $product->get_name() . ' - ';
                    $stock_status = $variation->get_stock_status();

                    foreach ($attributes as $attribute_name => $attribute_value) {
                        $variation_name .= wc_attribute_taxonomy_slug($attribute_name) . ': ' . $attribute_value . ' ';
                    }

                    // תמונה ראשית של הווריאציה
                    $thumbnail_id = $variation->get_image_id();
                    $image_url = $thumbnail_id ? wp_get_attachment_url($thumbnail_id) : wp_get_attachment_url($product->get_image_id());

                    // מחיר סופי של הווריאציה
                    $final_price = $variation->get_price();
                    $regular_price = $variation->get_regular_price();
                    $sale_price = $variation->get_sale_price();

                    $variations_array[] = array(
                        'id' => $variation_id,
                        'name' => urldecode($variation_name),
                        'price' => $final_price,
                        'regular_price' => $regular_price,
                        'sale_price' => $sale_price,
                        'image' => $image_url,
                        'stock_status' => $stock_status, // ✅ גם לכל ווריאציה
                    );
                }

                return $variations_array;
            }

            return array(); // אם לא מדובר במוצר עם ווריאציות
        }
    }
}
