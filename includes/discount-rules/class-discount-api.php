<?php
if (!defined('ABSPATH')) {
    exit;
}
if (!class_exists('Whiz_Discount_API')) {
class Whiz_Discount_API
{
    public function register_routes()
    {
        // Offers (popup confirm for gifts)
        register_rest_route('whizmanage/v1', '/offer', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'get_offer'],
                'permission_callback' => function () {
                    return Whizmanage_Discount_Functions::is_admin_allowed();
                },
            ],
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'post_offer'],
                'permission_callback' => function () {
                    return Whizmanage_Discount_Functions::is_admin_allowed();
                },
            ],
        ]);

        register_rest_route('whizmanage/v1', '/discount-rules', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'list_rules'],
                'permission_callback' => function () {
                    return Whizmanage_Discount_Functions::is_admin_allowed();
                },
            ],
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'create_rule'],
                'permission_callback' => function () {
                    return Whizmanage_Discount_Functions::is_admin_allowed();
                },
            ],
        ]);

        register_rest_route('whizmanage/v1', '/discount-rules/(?P<id>\d+)', [
            [
                'methods' => WP_REST_Server::EDITABLE, // PUT/PATCH
                'callback' => [$this, 'update_rule'],
                'permission_callback' => function () {
                    return Whizmanage_Discount_Functions::is_admin_allowed();
                },
            ],
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'update_rule'],
                'permission_callback' => function () {
                    return Whizmanage_Discount_Functions::is_admin_allowed();
                },
            ],
        ]);

        register_rest_route('whizmanage/v1', '/discount-rules/batch', [
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'batch_rules'],
                'permission_callback' => function () {
                    return Whizmanage_Discount_Functions::is_admin_allowed();
                },
            ],
        ]);
    }

    public function list_rules(?WP_REST_Request $req = null)
    {
        if ($req === null) {
            $req = new WP_REST_Request('GET', '/whizmanage/v1/discount-rules');
            $req->set_param('page', 1);
            $req->set_param('per_page', 9999);
        }

        global $wpdb;

        // פרמטרים בסיסיים
        $q        = sanitize_text_field($req->get_param('q') ?? '');
        $page     = max(1, (int) ($req->get_param('page') ?? 1));
        $per_page = max(1, min(200, (int) ($req->get_param('per_page') ?? 50)));
        $status   = sanitize_text_field($req->get_param('status') ?? ''); // '', 'publish','draft','trash'

        // סדר ומיון
        $orderby = sanitize_key($req->get_param('orderby') ?? 'id');
        $order   = strtoupper(sanitize_text_field($req->get_param('order') ?? 'DESC')) === 'ASC' ? 'ASC' : 'DESC';

        // טווחי תאריכים
        $start_from = $req->get_param('start_from') ? Whizmanage_Discount_Functions::parse_datetime($req->get_param('start_from')) : null;
        $start_to   = $req->get_param('start_to')   ? Whizmanage_Discount_Functions::parse_datetime($req->get_param('start_to'))   : null;
        $end_from   = $req->get_param('end_from')   ? Whizmanage_Discount_Functions::parse_datetime($req->get_param('end_from'))   : null;
        $end_to     = $req->get_param('end_to')     ? Whizmanage_Discount_Functions::parse_datetime($req->get_param('end_to'))     : null;

        $offset = ($page - 1) * $per_page;

        // טבלה (ודא ש-Whizmanage_Discount_Functions::get_table_name() מחזיר $wpdb->prefix . '...שם_קבוע...')
        $table = esc_sql(Whizmanage_Discount_Functions::get_table_name());

        /**
         * WHERE בצורה "בטוחה": sql + args
         * נשמור התנהגות זהה ללוגיקה שלך
         */
        $where_sql  = '1=1';
        $where_args = [];

        // ---- סינון לפי type: תומך בריבוי (array או פסיקים) ----
        $types_param = $req->get_param('type');
        $types       = [];

        if (!empty($types_param)) {
            if (is_array($types_param)) {
                $types = $types_param; // ?type=a&type=b
            } else {
                $types = array_map('trim', explode(',', (string) $types_param)); // "a,b"
            }

            $types = array_filter(array_map('sanitize_key', $types));

            if (class_exists('Whiz_Discount_Rule') && !empty(Whiz_Discount_Rule::$allowed_types)) {
                $types = array_values(array_intersect($types, Whiz_Discount_Rule::$allowed_types));
            }

            if (!empty($types)) {
                $placeholders = implode(',', array_fill(0, count($types), '%s'));
                $where_sql   .= " AND type IN ($placeholders)";
                $where_args   = array_merge($where_args, $types);
            }
        }

        // סטטוס (אותו behavior)
        if ($status === 'trash') {
            $where_sql  .= " AND status = %s";
            $where_args[] = 'trash';
        } elseif ($status === 'draft') {
            $where_sql  .= " AND status = %s";
            $where_args[] = 'draft';
        } elseif ($status === 'publish') {
            $where_sql  .= " AND status = %s";
            $where_args[] = 'publish';
        } else {
            $where_sql  .= " AND status <> %s";
            $where_args[] = 'trash';
        }

        // חיפוש טקסטואלי
        if ($q !== '') {
            $like = '%' . $wpdb->esc_like($q) . '%';
            $where_sql  .= " AND (name LIKE %s OR type LIKE %s)";
            $where_args[] = $like;
            $where_args[] = $like;
        }

        // טווחי תאריכים (רכים – מכבדים NULL כ"פתוח")
        if ($start_from) {
            $where_sql  .= " AND (start_date IS NULL OR start_date >= %s)";
            $where_args[] = $start_from;
        }
        if ($start_to) {
            $where_sql  .= " AND (start_date IS NULL OR start_date <= %s)";
            $where_args[] = $start_to;
        }
        if ($end_from) {
            $where_sql  .= " AND (end_date IS NULL OR end_date >= %s)";
            $where_args[] = $end_from;
        }
        if ($end_to) {
            $where_sql  .= " AND (end_date IS NULL OR end_date <= %s)";
            $where_args[] = $end_to;
        }

        // לבטיחות – רק עמודות מותרות (כמו אצלך)
        $allowed_orderby = ['id', 'name', 'type', 'status', 'start_date', 'end_date', 'priority', 'updated_at', 'created_at'];
        if (!in_array($orderby, $allowed_orderby, true)) {
            $orderby = 'id';
        }
        global $wpdb;

        /**
         * Table name is internal (not user input). Still escape as identifier.
         */
        $table = Whizmanage_Discount_Functions::get_table_name();
        $table = esc_sql($table); // identifier hardening

        // Whitelist ORDER BY
        $allowed_orderby = array('id', 'name', 'type', 'status', 'start_date', 'end_date', 'priority', 'updated_at', 'created_at');
        if (! in_array($orderby, $allowed_orderby, true)) {
            $orderby = 'id';
        }
        $order = (strtoupper($order) === 'ASC') ? 'ASC' : 'DESC';

        /**
         * IMPORTANT:
         * $where_sql must include ONLY fixed SQL fragments + placeholders (%s/%d).
         * $where_args must be a flat array matching the placeholders order.
         */

        // COUNT query (build as a single string, table already escaped)
        // phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- Checked and safe.
        $count_query = "SELECT COUNT(*) FROM {$table} WHERE {$where_sql}";

        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- Prepared below; table is internal and escaped; where_sql contains placeholders only.
        $count_prepared = $wpdb->prepare($count_query, ...$where_args);

        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- $count_prepared is prepared via $wpdb->prepare().
        $total = (int) $wpdb->get_var($count_prepared);

        // SELECT query
        // phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- Checked and safe.
        $select_query = "SELECT * FROM {$table} WHERE {$where_sql} ORDER BY {$orderby} {$order} LIMIT %d OFFSET %d";
        $select_args  = array_merge($where_args, array((int) $per_page, (int) $offset));

        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- Prepared below; table is internal and escaped; where_sql contains placeholders only.
        $select_prepared = $wpdb->prepare($select_query, ...$select_args);

        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- $select_prepared is prepared via $wpdb->prepare().
        $items = $wpdb->get_results($select_prepared, ARRAY_A);

        // תגובה עם כותרות עימוד
        $response = rest_ensure_response($items);
        $response->header('X-WP-Total', $total);
        $response->header('X-WP-TotalPages', max(1, (int) ceil($total / $per_page)));
        return $response;
    }


    public function create_rule(WP_REST_Request $req)
    {
        global $wpdb;

        // Free version: maximum 1 discount rule allowed
        $table = Whizmanage_Discount_Functions::get_table_name();
        $existing_count = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table} WHERE status != 'trash'");
        if ($existing_count >= 1) {
            return new WP_Error('whiz_dr_limit', __('Free version allows maximum 1 discount rule. Upgrade to Pro for unlimited rules.', 'whizmanage'), ['status' => 403]);
        }

        $payload = Whiz_Discount_Rule::sanitize($req->get_json_params());
        unset($payload['id']);

        $errors = Whiz_Discount_Rule::validate($payload);
        if ($errors) {
            return new WP_Error('whiz_dr_validation', implode("\n", $errors), ['status' => 400]);
        }

        $now = Whizmanage_Discount_Functions::get_current_time();
        $result = $wpdb->insert(Whizmanage_Discount_Functions::get_table_name(), [
            'name' => $payload['name'],
            'type' => $payload['type'],
            'status' => $payload['status'],              // ← במקום active
            'start_date' => $payload['start_date'],
            'end_date' => $payload['end_date'],
            'conditions' => Whizmanage_Discount_Functions::json_encode($payload['conditions']),
            'actions' => Whizmanage_Discount_Functions::json_encode($payload['actions']),
            'filters' => Whizmanage_Discount_Functions::json_encode($payload['filters'] ?? []),
            'priority' => $payload['priority'],
            'message' => $payload['message'],
            'show_message' => $payload['show_message'] ?? true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        if ($result === false) {
            return new WP_Error('whiz_dr_db_error', 'Failed to insert rule: ' . $wpdb->last_error, ['status' => 500]);
        }

        $id = (int) $wpdb->insert_id;

        $payload['id'] = $id;
        $payload['created_at'] = $now;
        $payload['updated_at'] = $now;

        return rest_ensure_response($payload);
    }

    public function update_rule(WP_REST_Request $req)
    {
        global $wpdb;

        $id = isset($req['id']) ? (int) $req['id'] : 0;

        $table = esc_sql(Whizmanage_Discount_Functions::get_table_name()); // Whizmanage_Discount_Functions::get_table_name() צריך להחזיר $wpdb->prefix . '...'

        // phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter
        $sql = "SELECT * FROM {$table} WHERE id = %d";

        $existing = $wpdb->get_row(
            // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
            $wpdb->prepare($sql, $id),
            ARRAY_A
        );

        if (!$existing) {
            return new WP_Error('whiz_dr_not_found', __('Rule not found', 'whizmanage'), ['status' => 404]);
        }


        // מה שהלקוח שלח בפועל
        $clientPatch = $req->get_json_params();
        $patch = $clientPatch;
        unset($patch['id']);

        // פענוח JSON לשדות מורכבים
        $existing['conditions'] = Whizmanage_Discount_Functions::json_decode($existing['conditions']);
        $existing['actions'] = Whizmanage_Discount_Functions::json_decode($existing['actions']);
        $existing['filters'] = Whizmanage_Discount_Functions::json_decode($existing['filters']);

        // מיזוג+סניטיזציה
        $merged = array_merge($existing, $patch);
        $sanitized = Whiz_Discount_Rule::sanitize($merged);

        // שינוי type => auto-draft (בלי להדליק ולידציה)
        $oldType = sanitize_key($existing['type'] ?? '');
        $newType = sanitize_key($sanitized['type'] ?? '');
        $autoDraft = false;
        if ($newType && $newType !== $oldType) {
            $patch['status'] = 'draft';
            $sanitized['status'] = 'draft';
            $autoDraft = true;
        }

        // ולידציה של type עצמו רק אם הלקוח שלח type
        if (isset($clientPatch['type'])) {
            if (empty($sanitized['type']) || !in_array($sanitized['type'], Whiz_Discount_Rule::$allowed_types, true)) {
                return new WP_Error(
                    'whiz_dr_validation',
                    'type must be one of: ' . implode(', ', Whiz_Discount_Rule::$allowed_types),
                    ['status' => 400]
                );
            }
        }

        // ❗️ולידציה רכה:
        // מפעילים ולידציה מלאה רק אם:
        // - הלקוח שינה אחד מאלה: actions, conditions, start_date, end_date, priority, filters
        //   (שם לא נספר כקריטי)
        // - או שהלקוח שינה status ל-"publish"
        $softCritical = ['actions', 'conditions', 'start_date', 'end_date', 'priority', 'filters'];
        $touchedSoft = array_values(array_intersect(array_keys($clientPatch), $softCritical));

        $statusRequested = array_key_exists('status', $clientPatch) ? sanitize_key($sanitized['status']) : null;
        $statusTriggersValidation = ($statusRequested === 'publish');

        // אל תספר status שנוסף אוטומטית (auto-draft) כטריגר
        if ($autoDraft && !array_key_exists('status', $clientPatch)) {
            // no-op; $statusRequested stays null
        }

        $shouldValidate = (!empty($touchedSoft)) || $statusTriggersValidation;

        if ($shouldValidate) {
            if ($errors = Whiz_Discount_Rule::validate($sanitized)) {
                return new WP_Error('whiz_dr_validation', implode("\n", (array) $errors), ['status' => 400]);
            }
        }

        // כתיבה ל-DB (קידוד JSON לשדות מורכבים)
        $fields = [];
        foreach ($patch as $k => $v) {
            $fields[$k] = in_array($k, ['conditions', 'actions', 'filters'], true)
                ? Whizmanage_Discount_Functions::json_encode($sanitized[$k])
                : $sanitized[$k];
        }
        $fields['updated_at'] = Whizmanage_Discount_Functions::get_current_time();

        $wpdb->update(Whizmanage_Discount_Functions::get_table_name(), $fields, ['id' => $id]);

        // תשובה
        $resp = array_merge($existing, $fields);
        $resp['conditions'] = Whizmanage_Discount_Functions::json_decode($resp['conditions']);
        $resp['actions'] = Whizmanage_Discount_Functions::json_decode($resp['actions']);
        $resp['filters'] = Whizmanage_Discount_Functions::json_decode($resp['filters']);

        return rest_ensure_response($resp);
    }


    public function get_offer(WP_REST_Request $req)
    {
        if (!function_exists('WC')) {
            return rest_ensure_response(['offer' => null]);
        }

        // Session bootstrap
        if (!WC()->session) {
            if (class_exists('WC_Session_Handler')) {
                WC()->session = new WC_Session_Handler();
                WC()->session->init();
            }
        }
        if (!WC()->session && method_exists(WC(), 'initialize_session')) {
            WC()->initialize_session();
        }

        // כתיבת עוגיית סשן על התגובה הזו
        if (WC()->session && method_exists(WC()->session, 'set_customer_session_cookie')) {
            WC()->session->set_customer_session_cookie(true);
        }

        // Cart bootstrap
        if (function_exists('wc_load_cart')) {
            wc_load_cart();
        } else {
            if (empty(WC()->cart) && class_exists('WC_Cart')) {
                WC()->cart = new WC_Cart();
            }
        }

        if (WC()->cart && method_exists(WC()->cart, 'calculate_totals')) {
            WC()->cart->calculate_totals();
        }

        // אם אין פריטים אמיתיים – נקה והחזר null
        if (WC()->cart && method_exists(WC()->cart, 'get_cart')) {
            $has_real = false;
            foreach (WC()->cart->get_cart() as $ci) {
                if (empty($ci['whiz_dr_gift']) && (int) ($ci['quantity'] ?? 0) > 0) {
                    $has_real = true;
                    break;
                }
            }
            if (!$has_real) {
                Whiz_Discount_Manager::clear_offer();
                return rest_ensure_response(['offer' => null]);
            }
        }

        $offer = Whiz_Discount_Manager::current_offer();
        if ($offer && empty($offer['requiresPopup'])) {
            return rest_ensure_response(['offer' => null]);
        }

        return rest_ensure_response(['offer' => $offer ?: null]);
    }

    public function post_offer(WP_REST_Request $req)
    {
        if (function_exists('WC')) {
            if (!WC()->session) {
                if (class_exists('WC_Session_Handler')) {
                    WC()->session = new WC_Session_Handler();
                    WC()->session->init();
                }
            }
            if (function_exists('wc_load_cart')) {
                wc_load_cart();
            } else {
                if (empty(WC()->cart) && class_exists('WC_Cart')) {
                    WC()->cart = new WC_Cart();
                }
            }
            // כתיבת העוגייה גם כאן
            if (WC()->session && method_exists(WC()->session, 'set_customer_session_cookie')) {
                WC()->session->set_customer_session_cookie(true);
            }
        }

        if (function_exists('WC') && WC()->cart && method_exists(WC()->cart, 'calculate_totals')) {
            WC()->cart->calculate_totals();
        }

        $action = sanitize_text_field($req->get_param('action') ?? '');

        if ($action === 'accept') {
            $res = Whiz_Discount_Manager::accept_offer();
            // גם אחרי accept ליתר ביטחון
            if (function_exists('WC') && WC()->session && method_exists(WC()->session, 'set_customer_session_cookie')) {
                WC()->session->set_customer_session_cookie(true);
            }
        } elseif ($action === 'decline') {
            $res = Whiz_Discount_Manager::decline_offer();
        } else {
            // *** תיקון חשוב: המפתח צריך להיות status ולא active ***
            return new WP_Error('bad_action', 'action must be accept or decline', ['status' => 400]);
        }

        if (is_wp_error($res)) {
            $code = $res->get_error_code();
            $msg = $res->get_error_message();
            $status = 400;
            if ($code === 'no_offer') {
                $status = 409;
            }
            if ($code === 'no_session' || $code === 'no_cart') {
                $status = 503;
            }
            if ($code === 'add_failed') {
                $status = 409;
            }
            // *** גם כאן: להחזיר status ***
            return new WP_Error($code, $msg, ['status' => $status]);
        }

        return rest_ensure_response($res);
    }

    public function batch_rules(WP_REST_Request $req)
    {
        global $wpdb;
        $table = Whizmanage_Discount_Functions::get_table_name();

        $json = $req->get_json_params();
        $create = isset($json['create']) && is_array($json['create']) ? $json['create'] : [];
        $update = isset($json['update']) && is_array($json['update']) ? $json['update'] : [];
        $delete = isset($json['delete']) && is_array($json['delete']) ? $json['delete'] : [];

        $out = ['create' => [], 'update' => [], 'delete' => []];

        // ===== CREATE =====
        // Free version: maximum 1 discount rule allowed
        if (!empty($create)) {
            $existing_count = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table} WHERE status != 'trash'");
            if ($existing_count >= 1) {
                return new WP_Error('whiz_dr_limit', __('Free version allows maximum 1 discount rule. Upgrade to Pro for unlimited rules.', 'whizmanage'), ['status' => 403]);
            }
        }

        foreach ($create as $item) {
            $payload = Whiz_Discount_Rule::sanitize($item);
            unset($payload['id']);

            if ($errors = Whiz_Discount_Rule::validate($payload)) {
                return new WP_Error('whiz_dr_validation', implode("\n", (array) $errors), ['status' => 400]);
            }

            $now = Whizmanage_Discount_Functions::get_current_time();
            $payload['created_at'] = $now;
            $payload['updated_at'] = $now;

            foreach (['conditions', 'actions', 'filters'] as $jk) {
                $payload[$jk] = Whizmanage_Discount_Functions::json_encode($payload[$jk] ?? []);
            }

            $wpdb->insert($table, $payload);
            $id = (int) $wpdb->insert_id;

            $payload['id'] = $id;
            $out['create'][] = $payload;
        }

        // ===== UPDATE (עם אי-עדכון id + תשובה עם id אמיתי) =====
        foreach ($update as $patch) {
            // בדיקות id ברורות יותר
            if (!isset($patch['id'])) {
                return new WP_Error('whiz_dr_validation', 'Missing id for update item', ['status' => 400]);
            }
            $id = (int) $patch['id'];
            if ($id <= 0) {
                return new WP_Error('whiz_dr_validation', 'Invalid id for update item', ['status' => 400]);
            }

            $existing = $wpdb->get_row(
                $wpdb->prepare("SELECT * FROM $table WHERE id = %d", $id),
                ARRAY_A
            );
            if (!$existing) {
                return new WP_Error('whiz_dr_not_found', "Rule id $id not found", ['status' => 404]);
            }

            $clientPatch = $patch;

            // אל תאפשר עדכון של עמודת id
            unset($patch['id']);

            // פענוח שדות JSON קיימים
            $existing['conditions'] = Whizmanage_Discount_Functions::json_decode($existing['conditions']);
            $existing['actions'] = Whizmanage_Discount_Functions::json_decode($existing['actions']);
            $existing['filters'] = Whizmanage_Discount_Functions::json_decode($existing['filters']);

            // מיזוג + סניטיזציה
            $merged = array_merge($existing, $patch);
            $sanitized = Whiz_Discount_Rule::sanitize($merged);

            // שינוי type ⇒ מעבר ל-draft אוטומטי (רק אם לא נשלח status מפורשות)
            $oldType = sanitize_key($existing['type'] ?? '');
            $newType = sanitize_key($sanitized['type'] ?? '');
            $autoDraft = false;
            if ($newType && $newType !== $oldType) {
                if (!array_key_exists('status', $clientPatch)) {
                    $patch['status'] = 'draft';
                    $sanitized['status'] = 'draft';
                    $autoDraft = true;
                }
            }

            // ולידציית type אם הלקוח שלח type
            if (isset($clientPatch['type'])) {
                if (empty($sanitized['type']) || !in_array($sanitized['type'], Whiz_Discount_Rule::$allowed_types, true)) {
                    return new WP_Error(
                        'whiz_dr_validation',
                        'type must be one of: ' . implode(', ', Whiz_Discount_Rule::$allowed_types),
                        ['status' => 400]
                    );
                }
            }

            // ולידציה רכה
            $softCritical = ['actions', 'conditions', 'start_date', 'end_date', 'priority', 'filters'];
            $touchedSoft = array_values(array_intersect(array_keys($clientPatch), $softCritical));
            $statusRequested = array_key_exists('status', $clientPatch) ? sanitize_key($sanitized['status']) : null;
            $statusTriggersValidation = ($statusRequested === 'publish');
            if ($autoDraft && !array_key_exists('status', $clientPatch)) {
                // לא מחשיבים את הסטטוס שהוסף אוטומטית כטריגר
            }
            $shouldValidate = (!empty($touchedSoft)) || $statusTriggersValidation;

            if ($shouldValidate) {
                if ($errors = Whiz_Discount_Rule::validate($sanitized)) {
                    return new WP_Error('whiz_dr_validation', implode("\n", (array) $errors), ['status' => 400]);
                }
            }

            // בניית שדות לעדכון (ללא id!)
            $fields = [];
            foreach ($patch as $k => $v) {
                if ($k === 'id') {
                    continue;
                } // ביטחון כפול
                $fields[$k] = in_array($k, ['conditions', 'actions', 'filters'], true)
                    ? Whizmanage_Discount_Functions::json_encode($sanitized[$k])
                    : $sanitized[$k];
            }

            // המרה ל-int ל-priority במקרה שחזר מחרוזת
            if (isset($fields['priority'])) {
                $fields['priority'] = (int) $fields['priority'];
            }

            $fields['updated_at'] = Whizmanage_Discount_Functions::get_current_time();

            $wpdb->update($table, $fields, ['id' => $id]);

            // תשובה: למזג, ואז להחזיר תמיד id אמיתי
            $resp = array_merge($existing, $fields);
            $resp['id'] = $existing['id']; // לשמר את ה-id המקורי

            // פענוח JSON חזרה לתגובה
            $resp['conditions'] = Whizmanage_Discount_Functions::json_decode($resp['conditions']);
            $resp['actions'] = Whizmanage_Discount_Functions::json_decode($resp['actions']);
            $resp['filters'] = Whizmanage_Discount_Functions::json_decode($resp['filters']);

            $out['update'][] = $resp;
        }

        // ===== DELETE =====
        foreach ($delete as $delId) {
            $wpdb->delete($table, ['id' => (int) $delId]);
            $out['delete'][] = ['id' => (int) $delId, 'deleted' => true];
        }

        return rest_ensure_response($out);
    }
}
}