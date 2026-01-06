<?php
if (!defined('ABSPATH')) {
    exit;
}
if (!class_exists('Whiz_Discount_Rule')) {
    class Whiz_Discount_Rule
    {
        public static $allowed_types = [
            'product_adjustment',
            'cart_adjustment',
            'bulk_discount',
            'bogo_discount',
            'bxgy_discount',
            'shipping_discount',
            'spend_bundle',
        ];

        public static $allowed_statuses = ['publish', 'draft', 'trash'];

        public static function sanitize($data)
        {
            $data = wp_unslash($data);

            $out = [
                'name' => sanitize_text_field($data['name'] ?? ''),
                'type' => sanitize_key($data['type'] ?? ''),
                'start_date' => Whizmanage_Discount_Functions::parse_datetime($data['start_date'] ?? null),
                'end_date' => Whizmanage_Discount_Functions::parse_datetime($data['end_date'] ?? null),
                'priority' => (int) ($data['priority'] ?? 0),
                'conditions' => [],
                'actions' => [],
                'message' => isset($data['message']) ? sanitize_text_field($data['message']) : '',
                'show_message' => isset($data['show_message']) ? (bool) $data['show_message'] : true,
            ];

            $raw_status = isset($data['status']) ? sanitize_key($data['status']) : 'publish';
            if (!in_array($raw_status, self::$allowed_statuses, true)) {
                $raw_status = 'publish';
            }
            $out['status'] = $raw_status;

            // ----- conditions -----
            $cond_in = Whizmanage_Discount_Functions::json_decode($data['conditions'] ?? []);
            $logic = isset($cond_in['logic']) ? sanitize_key($cond_in['logic']) : 'all';
            if (!in_array($logic, ['all', 'any'], true)) {
                $logic = 'all';
            }

            // Normalize attributes [{taxonomy, term_id}] / "pa_color:12"
            $norm_attr = function ($arr) {
                $out = [];
                foreach ((array) $arr as $row) {
                    if (is_array($row)) {
                        $tax = sanitize_key($row['taxonomy'] ?? ($row['tax'] ?? ($row['slug'] ?? '')));
                        $tid = isset($row['term_id']) ? (int) $row['term_id'] : (int) ($row['id'] ?? 0);
                        if (!$tax || $tid <= 0) {
                            continue;
                        }
                        if (strpos($tax, 'pa_') !== 0) {
                            $tax = 'pa_' . $tax;
                        }
                        $out[] = ['taxonomy' => $tax, 'term_id' => $tid];
                    } elseif (is_string($row) && strpos($row, ':') !== false) {
                        list($tax, $idStr) = array_map('trim', explode(':', $row, 2));
                        $tax = sanitize_key($tax);
                        $tid = (int) $idStr;
                        if ($tax && $tid > 0) {
                            if (strpos($tax, 'pa_') !== 0) {
                                $tax = 'pa_' . $tax;
                            }
                            $out[] = ['taxonomy' => $tax, 'term_id' => $tid];
                        }
                    }
                }
                // unique
                $seen = [];
                $uniq = [];
                foreach ($out as $p) {
                    $k = $p['taxonomy'] . ':' . $p['term_id'];
                    if (isset($seen[$k])) {
                        continue;
                    }
                    $seen[$k] = 1;
                    $uniq[] = $p;
                }
                return $uniq;
            };

            // Normalize SKUs (lowercase, trimmed) and unique
            $norm_skus = function ($arr) {
                $buf = [];
                foreach ((array) $arr as $s) {
                    if (!is_scalar($s)) {
                        continue;
                    }
                    $sku = strtolower(trim((string) $s));
                    $sku = sanitize_text_field($sku);
                    if ($sku !== '') {
                        $buf[] = $sku;
                    }
                }
                return array_values(array_unique($buf));
            };

            $conditions = [
                'logic' => $logic,
                'product_cat_ids' => isset($cond_in['product_cat_ids']) ? array_values(array_filter((array) $cond_in['product_cat_ids'], 'is_scalar')) : [],
                'exclude_product_cat_ids' => isset($cond_in['exclude_product_cat_ids']) ? array_values(array_filter((array) $cond_in['exclude_product_cat_ids'], 'is_scalar')) : [],
                'product_ids' => isset($cond_in['product_ids']) ? array_values(array_filter((array) $cond_in['product_ids'], 'is_scalar')) : [],
                'exclude_product_ids' => isset($cond_in['exclude_product_ids']) ? array_values(array_filter((array) $cond_in['exclude_product_ids'], 'is_scalar')) : [],
                'user_roles' => isset($cond_in['user_roles']) ? array_values(array_filter((array) $cond_in['user_roles'], 'is_scalar')) : [],
                'user_roles_exclude' => isset($cond_in['user_roles_exclude']) ? array_values(array_filter((array) $cond_in['user_roles_exclude'], 'is_scalar')) : [],
                'min_qty' => isset($cond_in['min_qty']) && $cond_in['min_qty'] !== '' ? (int) $cond_in['min_qty'] : null,

                // attributes
                'attribute_terms' => $norm_attr($cond_in['attribute_terms'] ?? []),
                'exclude_attribute_terms' => $norm_attr($cond_in['exclude_attribute_terms'] ?? []),

                // tags
                'product_tag_ids' => isset($cond_in['product_tag_ids']) ? array_values(array_filter((array) $cond_in['product_tag_ids'], 'is_scalar')) : [],
                'exclude_product_tag_ids' => isset($cond_in['exclude_product_tag_ids']) ? array_values(array_filter((array) $cond_in['exclude_product_tag_ids'], 'is_scalar')) : [],

                // SKUs
                'product_skus' => $norm_skus($cond_in['product_skus'] ?? []),
                'exclude_product_skus' => $norm_skus($cond_in['exclude_product_skus'] ?? []),

                // NEW: on-sale flags
                'require_on_sale' => !empty($cond_in['require_on_sale']) ? (bool) $cond_in['require_on_sale'] : false,
                'exclude_on_sale' => !empty($cond_in['exclude_on_sale']) ? (bool) $cond_in['exclude_on_sale'] : false,
            ];

            if ($conditions['min_qty'] !== null && $conditions['min_qty'] < 0) {
                $conditions['min_qty'] = 0;
            }
            // prevent contradictory flags
            if (!empty($conditions['require_on_sale'])) {
                $conditions['exclude_on_sale'] = false;
            }

            $rules = [];
            $rules_in = isset($cond_in['rules']) && is_array($cond_in['rules']) ? $cond_in['rules'] : [];
            foreach ($rules_in as $r) {
                $kind = sanitize_key($r['kind'] ?? '');
                $scope = sanitize_key($r['scope'] ?? 'cart');
                $ids = array_map('intval', (array) ($r['ids'] ?? []));
                $compare = sanitize_key($r['compare'] ?? 'gte');
                $amount = isset($r['amount']) ? floatval($r['amount']) : 0;

                if (!in_array($kind, ['subtotal', 'item_count'], true)) {
                    continue;
                }
                if (!in_array($scope, ['cart', 'categories', 'products'], true)) {
                    continue;
                }
                if (!in_array($compare, ['gt', 'gte', 'lt', 'lte', 'eq', 'neq'], true)) {
                    continue;
                }

                $rules[] = compact('kind', 'scope', 'ids', 'compare', 'amount');
            }
            $conditions['rules'] = $rules;
            $out['conditions'] = $conditions;

            // ----- actions -----
            $a_in = Whizmanage_Discount_Functions::json_decode($data['actions'] ?? []);
            switch ($out['type']) {
                case 'product_adjustment':
                case 'cart_adjustment':
                    $method = $a_in['method'] ?? 'percentage';
                    $out['actions'] = [
                        'method' => in_array($method, ['percentage', 'fixed'], true) ? $method : 'percentage',
                        'value' => isset($a_in['value']) ? floatval($a_in['value']) : 0,
                        'apply_as_coupon' => !empty($a_in['apply_as_coupon']),
                        'coupon_label' => isset($a_in['coupon_label']) ? sanitize_text_field($a_in['coupon_label']) : '',
                    ];
                    break;

                case 'bogo_discount':
                    $out['actions'] = [
                        'x_qty' => isset($a_in['x_qty']) ? (int) $a_in['x_qty'] : 0,
                        'y_qty' => isset($a_in['y_qty']) ? (int) $a_in['y_qty'] : 0,
                        'discount_pct' => isset($a_in['discount_pct']) ? floatval($a_in['discount_pct']) : 0,
                        'target_product_ids' => isset($a_in['target_product_ids']) ? array_map('intval', (array) $a_in['target_product_ids']) : [],
                        'recursive' => !empty($a_in['recursive']),
                    ];
                    break;

                case 'bxgy_discount':
                    $out['actions'] = [
                        'x_qty' => isset($a_in['x_qty']) ? (int) $a_in['x_qty'] : 0,
                        'y_qty' => isset($a_in['y_qty']) ? (int) $a_in['y_qty'] : 0,
                        'discount_pct' => isset($a_in['discount_pct']) ? floatval($a_in['discount_pct']) : 0,
                        'buy_product_ids' => isset($a_in['buy_product_ids']) ? array_map('intval', (array) $a_in['buy_product_ids']) : [],
                        'get_product_ids' => isset($a_in['get_product_ids']) ? array_map('intval', (array) $a_in['get_product_ids']) : [],
                        'recursive' => !empty($a_in['recursive']),
                    ];
                    break;

                case 'bulk_discount':
                    $T = [];
                    if (!empty($a_in['tiers']) && is_array($a_in['tiers'])) {
                        foreach ($a_in['tiers'] as $t) {
                            $has_pct = isset($t['pct']) && is_numeric($t['pct']);
                            $min = isset($t['min']) ? (int) $t['min'] : 0;
                            $maxRaw = $t['max'] ?? null;
                            $max = ($maxRaw === '' || $maxRaw === null) ? null : (int) $maxRaw;
                            $method = $has_pct ? 'percentage' : (in_array(($t['method'] ?? ''), ['percentage', 'fixed'], true) ? $t['method'] : 'percentage');
                            $amount = $has_pct ? floatval($t['pct']) : floatval($t['amount'] ?? 0);
                            $label = isset($t['label']) && is_scalar($t['label']) ? sanitize_text_field($t['label']) : '';
                            $T[] = ['min' => $min, 'max' => $max, 'method' => $method, 'amount' => $amount, 'label' => $label];
                        }
                    }
                    usort($T, function ($x, $y) {
                        $xm = $x['max'] === null ? PHP_INT_MAX : $x['max'];
                        $ym = $y['max'] === null ? PHP_INT_MAX : $y['max'];
                        if ($x['min'] === $y['min']) {
                            return $xm <=> $ym;
                        }
                        return $x['min'] <=> $y['min'];
                    });
                    $out['actions'] = [
                        'tiers' => $T,
                        'apply_as_coupon' => !empty($a_in['apply_as_coupon']),
                        'coupon_label' => isset($a_in['coupon_label']) ? sanitize_text_field($a_in['coupon_label']) : '',
                    ];
                    break;

                case 'shipping_discount':
                    $methods = [];
                    foreach ((array) ($a_in['shipping_methods'] ?? []) as $m) {
                        if (is_scalar($m)) {
                            $methods[] = sanitize_text_field((string) $m);
                        }
                    }
                    $method = $a_in['method'] ?? 'percentage';
                    $out['actions'] = [
                        'method' => in_array($method, ['percentage', 'fixed'], true) ? $method : 'percentage',
                        'value' => isset($a_in['value']) ? floatval($a_in['value']) : 0,
                        'shipping_methods' => array_values(array_unique(array_filter($methods))),
                        'label' => isset($a_in['label']) ? sanitize_text_field($a_in['label']) : '',
                    ];
                    break;

                case 'spend_bundle':
                    $method = $a_in['method'] ?? 'fixed'; // fixed | percentage
                    $out['actions'] = [
                        'unit_amount' => isset($a_in['unit_amount']) ? max(0, floatval($a_in['unit_amount'])) : 0,
                        'method' => in_array($method, ['percentage', 'fixed'], true) ? $method : 'fixed',
                        'value' => isset($a_in['value']) ? max(0, floatval($a_in['value'])) : 0,
                        'coupon_label' => isset($a_in['coupon_label']) ? sanitize_text_field($a_in['coupon_label']) : '',
                        'apply_as_coupon' => !empty($a_in['apply_as_coupon']),
                        'recursive' => !empty($a_in['recursive']),
                    ];
                    break;

                default:
                    $out['actions'] = [];
            }

            // ----- filters (pass-through normalized) -----
            $out['filters'] = [];
            if (isset($data['filters']) && is_array($data['filters'])) {
                $out['filters'] = array_values(array_map(function ($f) {
                    $field = isset($f['field']) ? sanitize_key($f['field']) : '';
                    $opRaw = isset($f['op']) ? sanitize_key($f['op']) : 'include';
                    $op = in_array($opRaw, ['include', 'exclude'], true) ? $opRaw : 'include';

                    $rawVals = (array) ($f['values'] ?? []);

                    switch ($field) {
                        case 'categories':
                        case 'products':
                        case 'tags':
                            // מזהים מספריים
                            $values = array_map('intval', $rawVals);
                            break;

                        case 'skus':
                            // מזהים טקסטואליים – לא להמיר למספר!
                            $values = array_values(array_unique(array_filter(array_map(function ($s) {
                                $s = is_scalar($s) ? (string) $s : '';
                                $s = trim($s);
                                return $s === '' ? '' : sanitize_text_field($s);
                            }, $rawVals))));
                            break;

                        case 'user_roles':
                            $values = array_values(array_unique(array_filter(array_map(function ($s) {
                                return sanitize_key((string) $s);
                            }, $rawVals))));
                            break;

                        default:
                            // ברירת מחדל: השאר כפי שהוא, עם סניטציה רכה
                            $values = array_values(array_filter($rawVals, function ($v) {
                                return is_scalar($v);
                            }));
                            break;
                    }

                    return ['field' => $field, 'op' => $op, 'values' => $values];
                }, $data['filters']));
            }

            return $out;
        }

        public static function validate($payload)
        {
            $errors = [];

            if (empty($payload['name'])) {
                $errors[] = 'name is required';
            }
            if (empty($payload['type']) || !in_array($payload['type'], self::$allowed_types, true)) {
                $errors[] = 'type must be one of: ' . implode(', ', self::$allowed_types);
            }

            if (!empty($payload['start_date']) && !empty($payload['end_date'])) {
                if (strtotime($payload['start_date']) > strtotime($payload['end_date'])) {
                    $errors[] = 'end_date must be after start_date';
                }
            }

            $c = is_array($payload['conditions']) ? $payload['conditions'] : [];
            if (isset($c['logic']) && !in_array($c['logic'], ['all', 'any'], true)) {
                $errors[] = "conditions.logic must be 'all' or 'any'";
            }

            if (!empty($c['rules']) && is_array($c['rules'])) {
                foreach ($c['rules'] as $i => $r) {
                    if (!in_array($r['kind'] ?? '', ['subtotal', 'item_count'], true))
                        $errors[] = "conditions.rules[$i].kind invalid";
                    if (!in_array($r['scope'] ?? '', ['cart', 'categories', 'products'], true))
                        $errors[] = "conditions.rules[$i].scope invalid";
                    if (!in_array($r['compare'] ?? '', ['gt', 'gte', 'lt', 'lte', 'eq', 'neq'], true))
                        $errors[] = "conditions.rules[$i].compare invalid";
                    if (!is_numeric($r['amount'] ?? null))
                        $errors[] = "conditions.rules[$i].amount must be numeric";
                }
            }

            foreach (
                [
                    'product_cat_ids',
                    'exclude_product_cat_ids',
                    'product_ids',
                    'exclude_product_ids',
                    'user_roles',
                    'user_roles_exclude',
                    'product_tag_ids',
                    'exclude_product_tag_ids',
                    'product_skus',
                    'exclude_product_skus'
                ] as $arrKey
            ) {
                if (isset($c[$arrKey]) && !is_array($c[$arrKey])) {
                    $errors[] = "conditions.$arrKey must be an array";
                }
            }

            // validate skus elements
            foreach (['product_skus', 'exclude_product_skus'] as $arrKey) {
                if (isset($c[$arrKey]) && is_array($c[$arrKey])) {
                    foreach ($c[$arrKey] as $i => $s) {
                        if (!is_scalar($s) || trim((string) $s) === '') {
                            $errors[] = "conditions.$arrKey[$i] must be a non-empty string";
                        }
                    }
                }
            }

            if (isset($c['min_qty']) && $c['min_qty'] !== null && !is_numeric($c['min_qty'])) {
                $errors[] = "conditions.min_qty must be a number";
            }

            if (!in_array(($payload['status'] ?? ''), self::$allowed_statuses, true)) {
                $errors[] = "status must be one of: " . implode(', ', self::$allowed_statuses);
            }

            // attributes
            foreach (['attribute_terms', 'exclude_attribute_terms'] as $arrKey) {
                if (isset($c[$arrKey])) {
                    if (!is_array($c[$arrKey])) {
                        $errors[] = "conditions.$arrKey must be an array";
                    } else {
                        foreach ($c[$arrKey] as $i => $p) {
                            if (!is_array($p) || empty($p['taxonomy']) || !isset($p['term_id']) || !is_numeric($p['term_id'])) {
                                $errors[] = "conditions.$arrKey[$i] must have taxonomy and numeric term_id";
                            }
                        }
                    }
                }
            }

            // NEW: on-sale flags
            foreach (['require_on_sale', 'exclude_on_sale'] as $boolKey) {
                if (isset($c[$boolKey]) && !is_bool($c[$boolKey])) {
                    $errors[] = "conditions.$boolKey must be boolean";
                }
            }
            if (!empty($c['require_on_sale']) && !empty($c['exclude_on_sale'])) {
                $errors[] = "conditions.require_on_sale and conditions.exclude_on_sale cannot both be true";
            }

            $a = is_array($payload['actions']) ? $payload['actions'] : [];

            switch ($payload['type']) {
                case 'product_adjustment':
                case 'cart_adjustment':
                    $method = $a['method'] ?? 'percentage';
                    if (!in_array($method, ['percentage', 'fixed'], true))
                        $errors[] = 'actions.method must be percentage or fixed';
                    $v = floatval($a['value'] ?? -1);
                    if ($method === 'percentage' && ($v < 0 || $v > 100))
                        $errors[] = 'actions.value must be between 0-100';
                    if ($method === 'fixed' && $v < 0)
                        $errors[] = 'actions.value must be >= 0';
                    break;

                case 'bogo_discount':
                    $x = (int) ($a['x_qty'] ?? 0);
                    $y = (int) ($a['y_qty'] ?? 0);
                    $p = floatval($a['discount_pct'] ?? 0);
                    if ($x <= 0 || $y <= 0)
                        $errors[] = 'actions.x_qty and actions.y_qty must be > 0';
                    if ($p < 0 || $p > 100)
                        $errors[] = 'actions.discount_pct must be between 0-100';
                    if (isset($a['target_product_ids']) && !is_array($a['target_product_ids']))
                        $errors[] = 'actions.target_product_ids must be an array';
                    if (isset($a['recursive']) && !is_bool($a['recursive']))
                        $errors[] = 'actions.recursive must be boolean';
                    break;

                case 'bxgy_discount':
                    $x = (int) ($a['x_qty'] ?? 0);
                    $y = (int) ($a['y_qty'] ?? 0);
                    $p = floatval($a['discount_pct'] ?? 0);
                    if ($x <= 0 || $y <= 0)
                        $errors[] = 'actions.x_qty and actions.y_qty must be > 0';
                    if ($p < 0 || $p > 100)
                        $errors[] = 'actions.discount_pct must be between 0-100';
                    if (isset($a['buy_product_ids']) && !is_array($a['buy_product_ids']))
                        $errors[] = 'actions.buy_product_ids must be an array';
                    if (isset($a['get_product_ids']) && !is_array($a['get_product_ids']))
                        $errors[] = 'actions.get_product_ids must be an array';
                    if (isset($a['recursive']) && !is_bool($a['recursive']))
                        $errors[] = 'actions.recursive must be boolean';
                    break;

                case 'bulk_discount':
                    if (empty($a['tiers']) || !is_array($a['tiers'])) {
                        $errors[] = 'actions.tiers must be an array';
                    } else {
                        $norm = [];
                        foreach ($a['tiers'] as $i => $t) {
                            $min = isset($t['min']) ? (int) $t['min'] : -1;
                            $max = array_key_exists('max', $t) ? ($t['max'] === null || $t['max'] === '' ? null : (int) $t['max']) : null;
                            $method = $t['method'] ?? 'percentage';
                            $amount = isset($t['amount']) ? floatval($t['amount']) : 0;

                            if ($min < 0)
                                $errors[] = "actions.tiers[$i].min must be >= 0";
                            if (!($max === null || $max >= 0))
                                $errors[] = "actions.tiers[$i].max must be null or >= 0";
                            if ($max !== null && $max < $min)
                                $errors[] = "actions.tiers[$i].max must be >= min";
                            if (!in_array($method, ['percentage', 'fixed'], true))
                                $errors[] = "actions.tiers[$i].method invalid";
                            if ($amount < 0)
                                $errors[] = "actions.tiers[$i].amount must be >= 0";
                            if ($method === 'percentage' && $amount > 100)
                                $errors[] = "actions.tiers[$i].amount must be between 0-100 for percentage";
                            if (isset($t['label']) && !is_scalar($t['label']))
                                $errors[] = "actions.tiers[$i].label must be a string";

                            $norm[] = ['min' => $min, 'max' => $max];
                        }
                        usort($norm, function ($x, $y) {
                            $xm = $x['max'] === null ? PHP_INT_MAX : $x['max'];
                            $ym = $y['max'] === null ? PHP_INT_MAX : $y['max'];
                            if ($x['min'] === $y['min']) {
                                return $xm <=> $ym;
                            }
                            return $x['min'] <=> $y['min'];
                        });
                        for ($i = 1; $i < count($norm); $i++) {
                            $prevEnd = $norm[$i - 1]['max'] === null ? PHP_INT_MAX : $norm[$i - 1]['max'];
                            if ($norm[$i]['min'] <= $prevEnd) {
                                $errors[] = "actions.tiers[$i] overlaps previous tier";
                                break;
                            }
                        }
                    }
                    break;

                case 'shipping_discount':
                    $method = $a['method'] ?? 'percentage';
                    if (!in_array($method, ['percentage', 'fixed'], true))
                        $errors[] = 'actions.method must be percentage or fixed';
                    $v = floatval($a['value'] ?? -1);
                    if ($method === 'percentage' && ($v < 0 || $v > 100))
                        $errors[] = 'actions.value must be between 0-100';
                    if ($method === 'fixed' && $v < 0)
                        $errors[] = 'actions.value must be >= 0';
                    if (isset($a['shipping_methods']) && !is_array($a['shipping_methods']))
                        $errors[] = 'actions.shipping_methods must be an array';
                    break;

                case 'spend_bundle':
                    $unit = isset($a['unit_amount']) ? floatval($a['unit_amount']) : 0;
                    $method = $a['method'] ?? 'fixed';
                    $val = isset($a['value']) ? floatval($a['value']) : -1;
                    if ($unit <= 0)
                        $errors[] = 'actions.unit_amount must be > 0';
                    if (!in_array($method, ['percentage', 'fixed'], true))
                        $errors[] = 'actions.method must be percentage or fixed';
                    if ($val < 0 || ($method === 'percentage' && $val > 100))
                        $errors[] = 'actions.value out of range';
                    if (isset($a['coupon_label']) && !is_string($a['coupon_label']))
                        $errors[] = 'actions.coupon_label must be a string';
                    if (isset($a['apply_as_coupon']) && !is_bool($a['apply_as_coupon']))
                        $errors[] = 'actions.apply_as_coupon must be boolean';
                    if (isset($a['recursive']) && !is_bool($a['recursive']))
                        $errors[] = 'actions.recursive must be boolean';
                    break;
            }

            // filters must be an array of {field, op, values[]}
            if (isset($payload['filters'])) {
                if (!is_array($payload['filters'])) {
                    $errors[] = 'filters must be an array';
                } else {
                    foreach ($payload['filters'] as $i => $f) {
                        if (!is_array($f)) {
                            $errors[] = "filters[$i] must be an object";
                            continue;
                        }
                        if (empty($f['field']) || !is_string($f['field'])) {
                            $errors[] = "filters[$i].field is required";
                        }
                        if (isset($f['op']) && !in_array($f['op'], ['include', 'exclude'], true)) {
                            $errors[] = "filters[$i].op must be include|exclude";
                        }
                        if (isset($f['values']) && !is_array($f['values'])) {
                            $errors[] = "filters[$i].values must be an array";
                        }
                    }
                }
            }

            return $errors;
        }
    }
}
