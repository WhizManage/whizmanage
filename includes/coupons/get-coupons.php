<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}
if (!class_exists('Whizmanage_coupons_controller')) {
    class Whizmanage_coupons_controller
    {

        public function get_coupons(array $args = []) : array {
            $page     = max(1, intval($args['page'] ?? 1));
            $per_page = intval($args['per_page'] ?? 100);
            $search   = isset($args['search']) && trim((string)$args['search']) !== '' ? trim((string)$args['search']) : null;

            // status => כמו post_status של shop_coupon
            $status = $args['status'] ?? 'any';
            if (is_string($status)) {
                // לאפשר "any" או רשימת CSV
                $status = $status === 'any'
                    ? 'any'
                    : array_filter(array_map('trim', explode(',', $status)));
            }
            if ($status !== 'any' && !is_array($status)) {
                $status = ['publish'];
            }

            // discount_type אופציונלי
            $discount_type = $args['discount_type'] ?? null;
            if (is_string($discount_type)) {
                $discount_type = array_filter(array_map('trim', explode(',', $discount_type)));
            }
            if (!is_array($discount_type) || empty($discount_type)) {
                $discount_type = null;
            }

            $date_from = $args['date_from'] ?? null;
            $date_to   = $args['date_to']   ?? null;

            $q = [
                'post_type'      => 'shop_coupon',
                'posts_per_page' => ($per_page === -1 ? -1 : max(1, $per_page)),
                'paged'          => ($per_page === -1 ? 1 : $page),
                'post_status'    => ($status === 'any' ? 'any' : $status),
                'orderby'        => 'date',
                'order'          => 'DESC',
                's'              => $search ?: '',
            ];

            // טווח תאריכים על date_created (תאריך הפוסט)
            if ($date_from || $date_to) {
                $after  = $date_from ? $date_from . ' 00:00:00' : '';
                $before = $date_to   ? $date_to   . ' 23:59:59' : '';
                $q['date_query'] = [
                    array_filter([
                        'after'     => $after ?: null,
                        'before'    => $before ?: null,
                        'inclusive' => true,
                    ]),
                ];
            }

            // סינון לפי סוג הנחה (meta: discount_type)
            if ($discount_type) {
                $q['meta_query'] = [
                    [
                        'key'     => 'discount_type',
                        'value'   => $discount_type,
                        'compare' => 'IN',
                    ]
                ];
            }

            $wpq = new WP_Query($q);

            $rows = [];
            while ($wpq->have_posts()) {
                $wpq->the_post();
                $coupon_id = get_the_ID();
                $c = new WC_Coupon($coupon_id);

                $rows[] = $this->build_coupon_row($c);
            }
            wp_reset_postdata();

            // סכומים
            $total       = intval($wpq->found_posts);
            $total_pages = ($per_page === -1 ? 1 : max(1, intval($wpq->max_num_pages)));

            return [
                'ok'          => true,
                'page'        => ($per_page === -1 ? 1 : $page),
                'per_page'    => ($per_page === -1 ? count($rows) : $per_page),
                'total'       => $total,
                'total_pages' => $total_pages,
                'rows'        => array_map([$this, 'shape_to_ui'], $rows),
                'applied'     => [
                    'status'        => $status,
                    'discount_type' => $discount_type,
                    'date_from'     => $date_from,
                    'date_to'       => $date_to,
                    'search'        => $search,
                ],
            ];
        }

        private function build_coupon_row(WC_Coupon $coupon) : array {
            // שמות מוצרים לפי IDs
            $product_ids = $coupon->get_product_ids();
            $excluded_product_ids = $coupon->get_excluded_product_ids();

            return [
                'id'                          => $coupon->get_id(),
                'code'                        => $coupon->get_code(),
                'amount'                      => $coupon->get_amount(),
                'date'                        => $coupon->get_date_created() ? $coupon->get_date_created()->format('c') : null,
                'date_created_gmt'            => $coupon->get_date_created() ? gmdate('c', $coupon->get_date_created()->getTimestamp()) : null,
                'date_modified'               => $coupon->get_date_modified() ? $coupon->get_date_modified()->date('Y-m-d\TH:i:s') : null,
                'date_modified_gmt'           => $coupon->get_date_modified() ? $coupon->get_date_modified()->date('Y-m-d\TH:i:s', true) : null,
                'discount_type'               => $coupon->get_discount_type(),
                'description'                 => $coupon->get_description(),
                'date_expires'                => $coupon->get_date_expires() ? $coupon->get_date_expires()->format('c') : null,
                'date_expires_gmt'            => $coupon->get_date_expires() ? gmdate('c', $coupon->get_date_expires()->getTimestamp()) : null,
                'usage_count'                 => $coupon->get_usage_count(),
                'individual_use'              => $coupon->get_individual_use(),
                'product_ids'                 => $product_ids,
                'product_names'               => $this->get_product_names($product_ids),
                'excluded_product_ids'        => $excluded_product_ids,
                'excluded_product_names'      => $this->get_product_names($excluded_product_ids),
                'usage_limit'                 => $coupon->get_usage_limit(),
                'usage_limit_per_user'        => $coupon->get_usage_limit_per_user(),
                'limit_usage_to_x_items'      => $coupon->get_limit_usage_to_x_items(),
                'free_shipping'               => $coupon->get_free_shipping(),
                'product_categories'          => $coupon->get_product_categories(),
                'excluded_product_categories' => $coupon->get_excluded_product_categories(),
                'exclude_sale_items'          => $coupon->get_exclude_sale_items(),
                // NB: בצד קליינט יש מינוח כפול; נשמור את שניהם כדי לכסות:
                'minimum_amount'              => $coupon->get_minimum_amount(),
                'maximum_amount'              => $coupon->get_maximum_amount(),
                'minimum_spend'               => $coupon->get_minimum_amount(),
                'maximum_spend'               => $coupon->get_maximum_amount(),
                'status'                      => $coupon->get_status(),
                'email_restrictions'          => $coupon->get_email_restrictions(),
                'used_by'                     => $coupon->get_used_by(),
                'meta_data'                   => $coupon->get_meta_data(),
            ];
        }

        private function shape_to_ui(array $row) : array {
            // התאמה קטנה לציפיות ה־UI (כמו shape.toActive ב־JS)
            $row['date_modified_gmt'] = $row['date_modified_gmt'] ?? $row['date_modified'] ?? null;
            return $row;
        }

        private function get_product_names(array $ids) : array {
            if (empty($ids)) return [];
            $names = [];
            foreach ($ids as $pid) {
                $p = wc_get_product($pid);
                if (!$p) continue;
                if ($p->is_type('variation')) {
                    // שם וריאציה קריא
                    $names[] = wc_get_formatted_variation($p, true, false, false);
                } else {
                    $names[] = $p->get_name();
                }
            }
            return array_values(array_filter($names, 'strlen'));
        }
    }
}
