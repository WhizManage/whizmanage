<?php
/**

 *
 * @package WhizManage_Pro
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!class_exists('Whizmanage_rest_functions_shipping')) {

    class Whizmanage_rest_functions_shipping
    {
        /**
         * Constructor
         */
        public function __construct()
        {
            add_action('rest_api_init', array($this, 'register_routes'));
        }

        /**
         * Register REST API routes
         */
        public function register_routes()
        {
            // GET all shipping zones
            register_rest_route('whizmanage/v1', '/shipping/zones', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_zones'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // POST create new zone
            register_rest_route('whizmanage/v1', '/shipping/zones', array(
                'methods'             => 'POST',
                'callback'            => array($this, 'create_zone'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // PUT update zone
            register_rest_route('whizmanage/v1', '/shipping/zones/(?P<id>\d+)', array(
                'methods'             => 'PUT',
                'callback'            => array($this, 'update_zone'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // DELETE zone
            register_rest_route('whizmanage/v1', '/shipping/zones/(?P<id>\d+)', array(
                'methods'             => 'DELETE',
                'callback'            => array($this, 'delete_zone'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // POST add method to zone
            register_rest_route('whizmanage/v1', '/shipping/zones/(?P<zone_id>\d+)/methods', array(
                'methods'             => 'POST',
                'callback'            => array($this, 'add_method'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // PUT update method settings
            register_rest_route('whizmanage/v1', '/shipping/zones/(?P<zone_id>\d+)/methods/(?P<instance_id>\d+)', array(
                'methods'             => 'PUT',
                'callback'            => array($this, 'update_method'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // DELETE method from zone
            register_rest_route('whizmanage/v1', '/shipping/zones/(?P<zone_id>\d+)/methods/(?P<instance_id>\d+)', array(
                'methods'             => 'DELETE',
                'callback'            => array($this, 'delete_method'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // PUT reorder methods in zone
            register_rest_route('whizmanage/v1', '/shipping/zones/(?P<zone_id>\d+)/methods/reorder', array(
                'methods'             => 'PUT',
                'callback'            => array($this, 'reorder_methods'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // GET available locations (countries/states)
            register_rest_route('whizmanage/v1', '/shipping/locations', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_locations'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // GET available shipping methods
            register_rest_route('whizmanage/v1', '/shipping/methods', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_available_methods'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // GET shipping settings
            register_rest_route('whizmanage/v1', '/shipping/settings', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_shipping_settings'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // PUT update shipping settings
            register_rest_route('whizmanage/v1', '/shipping/settings', array(
                'methods'             => 'PUT',
                'callback'            => array($this, 'update_shipping_settings'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // GET all shipping classes
            register_rest_route('whizmanage/v1', '/shipping/classes', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_shipping_classes'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // POST create new shipping class
            register_rest_route('whizmanage/v1', '/shipping/classes', array(
                'methods'             => 'POST',
                'callback'            => array($this, 'create_shipping_class'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // PUT update shipping class
            register_rest_route('whizmanage/v1', '/shipping/classes/(?P<id>\d+)', array(
                'methods'             => 'PUT',
                'callback'            => array($this, 'update_shipping_class'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // DELETE shipping class
            register_rest_route('whizmanage/v1', '/shipping/classes/(?P<id>\d+)', array(
                'methods'             => 'DELETE',
                'callback'            => array($this, 'delete_shipping_class'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // ==================== Local Pickup Routes ====================

            // GET local pickup settings
            register_rest_route('whizmanage/v1', '/shipping/local-pickup/settings', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_local_pickup_settings'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // PUT update local pickup settings
            register_rest_route('whizmanage/v1', '/shipping/local-pickup/settings', array(
                'methods'             => 'PUT',
                'callback'            => array($this, 'update_local_pickup_settings'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // GET all pickup locations
            register_rest_route('whizmanage/v1', '/shipping/local-pickup/locations', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_pickup_locations'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // POST create new pickup location
            register_rest_route('whizmanage/v1', '/shipping/local-pickup/locations', array(
                'methods'             => 'POST',
                'callback'            => array($this, 'create_pickup_location'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // PUT update pickup location
            register_rest_route('whizmanage/v1', '/shipping/local-pickup/locations/(?P<id>\d+)', array(
                'methods'             => 'PUT',
                'callback'            => array($this, 'update_pickup_location'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // DELETE pickup location
            register_rest_route('whizmanage/v1', '/shipping/local-pickup/locations/(?P<id>\d+)', array(
                'methods'             => 'DELETE',
                'callback'            => array($this, 'delete_pickup_location'),
                'permission_callback' => array($this, 'permissions_check'),
            ));
        }

        /**
         * GET: Retrieve all shipping zones with their methods
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function get_zones(WP_REST_Request $request)
        {
            if (!class_exists('WC_Shipping_Zones')) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'WooCommerce shipping not available',
                ));
            }

            $zones_data = array();

            // Get all zones (excluding zone 0)
            $zones = WC_Shipping_Zones::get_zones();

            foreach ($zones as $zone_data) {
                $zone = new WC_Shipping_Zone($zone_data['id']);
                $zones_data[] = $this->format_zone($zone);
            }

            // Add zone 0 (Rest of the World) at the end
            $zone_0 = new WC_Shipping_Zone(0);
            $zones_data[] = $this->format_zone($zone_0, true);

            return rest_ensure_response($zones_data);
        }

        /**
         * Format zone data for response
         *
         * @param WC_Shipping_Zone $zone Zone object.
         * @param bool $is_default Whether this is the default zone (zone 0).
         * @return array
         */
        private function format_zone($zone, $is_default = false)
        {
            $methods = array();
            $shipping_methods = $zone->get_shipping_methods(false, 'admin');

            foreach ($shipping_methods as $method) {
                $methods[] = array(
                    'instance_id' => $method->instance_id,
                    'method_id'   => $method->id,
                    'title'       => $method->title,
                    'enabled'     => $method->is_enabled(),
                    'settings'    => $this->get_method_settings($method),
                );
            }

            $locations = array();
            if (!$is_default) {
                foreach ($zone->get_zone_locations() as $location) {
                    $locations[] = array(
                        'code' => $location->code,
                        'type' => $location->type,
                    );
                }
            }

            return array(
                'id'                 => $zone->get_id(),
                'name'               => $zone->get_zone_name(),
                'order'              => $zone->get_zone_order(),
                'locations'          => $locations,
                'formatted_location' => $zone->get_formatted_location(),
                'methods'            => $methods,
                'is_default'         => $is_default,
            );
        }

        /**
         * Get method settings based on method type
         *
         * @param WC_Shipping_Method $method Method object.
         * @return array
         */
        private function get_method_settings($method)
        {
            $settings = array();
            $instance_settings = $method->instance_settings;

            switch ($method->id) {
                case 'flat_rate':
                    // Extract class costs from WooCommerce format (class_cost_{term_id})
                    $class_costs = array();
                    $shipping_classes = WC()->shipping()->get_shipping_classes();

                    foreach ($shipping_classes as $shipping_class) {
                        $key = 'class_cost_' . $shipping_class->term_id;
                        if (isset($instance_settings[$key])) {
                            $class_costs[$shipping_class->term_id] = $instance_settings[$key];
                        }
                    }

                    $settings = array(
                        'cost'          => isset($instance_settings['cost']) ? $instance_settings['cost'] : '',
                        'tax_status'    => isset($instance_settings['tax_status']) ? $instance_settings['tax_status'] : 'taxable',
                        'class_costs'   => $class_costs,
                        'no_class_cost' => isset($instance_settings['no_class_cost']) ? $instance_settings['no_class_cost'] : '',
                        'type'          => isset($instance_settings['type']) ? $instance_settings['type'] : 'class',
                    );
                    break;

                case 'free_shipping':
                    $settings = array(
                        'requires'    => isset($instance_settings['requires']) ? $instance_settings['requires'] : '',
                        'min_amount'  => isset($instance_settings['min_amount']) ? $instance_settings['min_amount'] : '',
                        'ignore_discounts' => isset($instance_settings['ignore_discounts']) ? $instance_settings['ignore_discounts'] : 'no',
                    );
                    break;

                case 'local_pickup':
                    $settings = array(
                        'cost'       => isset($instance_settings['cost']) ? $instance_settings['cost'] : '',
                        'tax_status' => isset($instance_settings['tax_status']) ? $instance_settings['tax_status'] : 'taxable',
                    );
                    break;

                default:
                    // For other methods, return all instance settings
                    $settings = $instance_settings;
                    break;
            }

            return $settings;
        }

        /**
         * POST: Create new shipping zone
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function create_zone(WP_REST_Request $request)
        {
            $params = $request->get_json_params();

            $zone = new WC_Shipping_Zone();
            $zone->set_zone_name(sanitize_text_field($params['name']));

            if (isset($params['order'])) {
                $zone->set_zone_order(absint($params['order']));
            }

            $zone->save();

            // Add locations
            if (!empty($params['locations'])) {
                $this->update_zone_locations($zone, $params['locations']);
            }

            return rest_ensure_response(array(
                'success' => true,
                'zone'    => $this->format_zone($zone),
            ));
        }

        /**
         * PUT: Update shipping zone
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function update_zone(WP_REST_Request $request)
        {
            $zone_id = absint($request['id']);
            $params = $request->get_json_params();

            // Cannot modify zone 0
            if ($zone_id === 0) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'Cannot modify the default zone',
                ));
            }

            $zone = WC_Shipping_Zones::get_zone($zone_id);

            if (!$zone) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'Zone not found',
                ));
            }

            if (isset($params['name'])) {
                $zone->set_zone_name(sanitize_text_field($params['name']));
            }

            if (isset($params['order'])) {
                $zone->set_zone_order(absint($params['order']));
            }

            $zone->save();

            // Update locations
            if (isset($params['locations'])) {
                $this->update_zone_locations($zone, $params['locations']);
            }

            return rest_ensure_response(array(
                'success' => true,
                'zone'    => $this->format_zone($zone),
            ));
        }

        /**
         * Update zone locations
         *
         * @param WC_Shipping_Zone $zone Zone object.
         * @param array $locations Array of location data.
         */
        private function update_zone_locations($zone, $locations)
        {
            // Clear existing locations
            $zone->clear_locations();

            // Add new locations
            foreach ($locations as $location) {
                $code = sanitize_text_field($location['code']);
                $type = sanitize_text_field($location['type']);

                if (in_array($type, array('country', 'state', 'postcode', 'continent'), true)) {
                    $zone->add_location($code, $type);
                }
            }

            $zone->save();
        }

        /**
         * DELETE: Delete shipping zone
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function delete_zone(WP_REST_Request $request)
        {
            $zone_id = absint($request['id']);

            // Cannot delete zone 0
            if ($zone_id === 0) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'Cannot delete the default zone',
                ));
            }

            $zone = WC_Shipping_Zones::get_zone($zone_id);

            if (!$zone) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'Zone not found',
                ));
            }

            $zone->delete();

            return rest_ensure_response(array(
                'success' => true,
            ));
        }

        /**
         * POST: Add shipping method to zone
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function add_method(WP_REST_Request $request)
        {
            $zone_id = absint($request['zone_id']);
            $params = $request->get_json_params();
            $method_id = sanitize_text_field($params['method_id']);

            $zone = WC_Shipping_Zones::get_zone($zone_id);

            if (!$zone) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'Zone not found',
                ));
            }

            // Validate method_id
            $available_methods = WC()->shipping()->get_shipping_methods();
            if (!isset($available_methods[$method_id])) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'Invalid shipping method',
                ));
            }

            $instance_id = $zone->add_shipping_method($method_id);

            if ($instance_id === false) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'Failed to add shipping method',
                ));
            }

            // Get the newly added method
            $shipping_methods = $zone->get_shipping_methods(false, 'admin');
            $added_method = null;

            foreach ($shipping_methods as $method) {
                if ($method->instance_id == $instance_id) {
                    $added_method = array(
                        'instance_id' => $method->instance_id,
                        'method_id'   => $method->id,
                        'title'       => $method->title,
                        'enabled'     => $method->is_enabled(),
                        'settings'    => $this->get_method_settings($method),
                    );
                    break;
                }
            }

            return rest_ensure_response(array(
                'success' => true,
                'method'  => $added_method,
            ));
        }

        /**
         * PUT: Update shipping method settings
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function update_method(WP_REST_Request $request)
        {
            $zone_id = absint($request['zone_id']);
            $instance_id = absint($request['instance_id']);
            $params = $request->get_json_params();

            $zone = WC_Shipping_Zones::get_zone($zone_id);

            if (!$zone) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'Zone not found',
                ));
            }

            $shipping_methods = $zone->get_shipping_methods(false, 'admin');
            $method = null;

            foreach ($shipping_methods as $sm) {
                if ($sm->instance_id == $instance_id) {
                    $method = $sm;
                    break;
                }
            }

            if (!$method) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'Method not found',
                ));
            }

            // Update enabled status
            if (isset($params['enabled'])) {
                $enabled = $params['enabled'] ? 'yes' : 'no';
                $method->instance_settings['enabled'] = $enabled;

                // Update in database directly
                global $wpdb;
                $wpdb->update(
                    $wpdb->prefix . 'woocommerce_shipping_zone_methods',
                    array('is_enabled' => $params['enabled'] ? 1 : 0),
                    array('instance_id' => $instance_id)
                );
            }

            // Update title
            if (isset($params['title'])) {
                $method->instance_settings['title'] = sanitize_text_field($params['title']);
            }

            // Update method-specific settings
            if (isset($params['settings'])) {
                $settings = $params['settings'];

                switch ($method->id) {
                    case 'flat_rate':
                        if (isset($settings['cost'])) {
                            $method->instance_settings['cost'] = sanitize_text_field($settings['cost']);
                        }
                        if (isset($settings['tax_status'])) {
                            $method->instance_settings['tax_status'] = in_array($settings['tax_status'], array('taxable', 'none')) ? $settings['tax_status'] : 'taxable';
                        }
                        // Handle shipping class costs
                        if (isset($settings['class_costs']) && is_array($settings['class_costs'])) {
                            foreach ($settings['class_costs'] as $term_id => $cost) {
                                $key = 'class_cost_' . absint($term_id);
                                $method->instance_settings[$key] = sanitize_text_field($cost);
                            }
                        }
                        if (isset($settings['no_class_cost'])) {
                            $method->instance_settings['no_class_cost'] = sanitize_text_field($settings['no_class_cost']);
                        }
                        if (isset($settings['type'])) {
                            $method->instance_settings['type'] = in_array($settings['type'], array('class', 'order')) ? $settings['type'] : 'class';
                        }
                        break;

                    case 'free_shipping':
                        if (isset($settings['requires'])) {
                            $allowed = array('', 'coupon', 'min_amount', 'either', 'both');
                            $method->instance_settings['requires'] = in_array($settings['requires'], $allowed) ? $settings['requires'] : '';
                        }
                        if (isset($settings['min_amount'])) {
                            $method->instance_settings['min_amount'] = sanitize_text_field($settings['min_amount']);
                        }
                        if (isset($settings['ignore_discounts'])) {
                            $method->instance_settings['ignore_discounts'] = $settings['ignore_discounts'] ? 'yes' : 'no';
                        }
                        break;

                    case 'local_pickup':
                        if (isset($settings['cost'])) {
                            $method->instance_settings['cost'] = sanitize_text_field($settings['cost']);
                        }
                        if (isset($settings['tax_status'])) {
                            $method->instance_settings['tax_status'] = in_array($settings['tax_status'], array('taxable', 'none')) ? $settings['tax_status'] : 'taxable';
                        }
                        break;
                }
            }

            // Save instance settings
            update_option('woocommerce_' . $method->id . '_' . $instance_id . '_settings', $method->instance_settings);

            // Clear shipping cache
            WC_Cache_Helper::invalidate_cache_group('shipping_zones');
            delete_transient('woocommerce_shipping_methods');

            return rest_ensure_response(array(
                'success' => true,
                'method'  => array(
                    'instance_id' => $method->instance_id,
                    'method_id'   => $method->id,
                    'title'       => isset($method->instance_settings['title']) ? $method->instance_settings['title'] : $method->title,
                    'enabled'     => isset($params['enabled']) ? $params['enabled'] : $method->is_enabled(),
                    'settings'    => $this->get_method_settings($method),
                ),
            ));
        }

        /**
         * DELETE: Remove shipping method from zone
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function delete_method(WP_REST_Request $request)
        {
            $zone_id = absint($request['zone_id']);
            $instance_id = absint($request['instance_id']);

            $zone = WC_Shipping_Zones::get_zone($zone_id);

            if (!$zone) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'Zone not found',
                ));
            }

            $zone->delete_shipping_method($instance_id);

            return rest_ensure_response(array(
                'success' => true,
            ));
        }

        /**
         * PUT: Reorder shipping methods in a zone
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function reorder_methods(WP_REST_Request $request)
        {
            $zone_id = absint($request['zone_id']);
            $params = $request->get_json_params();

            if (empty($params['method_order']) || !is_array($params['method_order'])) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'method_order array is required',
                ));
            }

            $zone = WC_Shipping_Zones::get_zone($zone_id);

            if (!$zone) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'Zone not found',
                ));
            }

            global $wpdb;

            // Update the method_order for each instance
            $order = 0;
            foreach ($params['method_order'] as $instance_id) {
                $wpdb->update(
                    $wpdb->prefix . 'woocommerce_shipping_zone_methods',
                    array('method_order' => $order),
                    array(
                        'zone_id'     => $zone_id,
                        'instance_id' => absint($instance_id),
                    ),
                    array('%d'),
                    array('%d', '%d')
                );
                $order++;
            }

            // Clear shipping cache
            WC_Cache_Helper::invalidate_cache_group('shipping_zones');
            delete_transient('woocommerce_shipping_methods');

            return rest_ensure_response(array(
                'success' => true,
            ));
        }

        /**
         * GET: Available locations (countries and states)
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function get_locations(WP_REST_Request $request)
        {
            if (!function_exists('WC') || !WC()->countries) {
                return rest_ensure_response(array());
            }

            $result = array(
                'continents' => array(),
                'countries'  => array(),
            );

            // Get continents
            $continents = WC()->countries->get_continents();
            foreach ($continents as $code => $data) {
                $result['continents'][] = array(
                    'code' => $code,
                    'name' => $data['name'],
                );
            }

            // Get countries with states
            $countries = WC()->countries->get_countries();
            $states = WC()->countries->get_states();

            foreach ($countries as $code => $name) {
                $country_data = array(
                    'code' => $code,
                    'name' => $name,
                );

                if (isset($states[$code]) && !empty($states[$code])) {
                    $country_data['states'] = array();
                    foreach ($states[$code] as $state_code => $state_name) {
                        $country_data['states'][] = array(
                            'code' => $code . ':' . $state_code,
                            'name' => $state_name,
                        );
                    }
                }

                $result['countries'][] = $country_data;
            }

            return rest_ensure_response($result);
        }

        /**
         * GET: Available shipping methods
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function get_available_methods(WP_REST_Request $request)
        {
            if (!function_exists('WC') || !WC()->shipping()) {
                return rest_ensure_response(array());
            }

            $methods = WC()->shipping()->get_shipping_methods();
            $result = array();

            foreach ($methods as $method) {
                // Only include methods that support shipping zones
                if ($method->supports('shipping-zones')) {
                    $result[] = array(
                        'id'          => $method->id,
                        'title'       => $method->method_title,
                        'description' => $method->method_description,
                    );
                }
            }

            return rest_ensure_response($result);
        }

        // ==================== Shipping Settings ====================

        /**
         * GET: Retrieve shipping settings
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function get_shipping_settings(WP_REST_Request $request)
        {
            $settings = array(
                'woocommerce_enable_shipping_calc'          => get_option('woocommerce_enable_shipping_calc', 'yes'),
                'woocommerce_shipping_cost_requires_address' => get_option('woocommerce_shipping_cost_requires_address', 'no'),
                'woocommerce_ship_to_destination'           => get_option('woocommerce_ship_to_destination', 'billing'),
                'woocommerce_shipping_debug_mode'           => get_option('woocommerce_shipping_debug_mode', 'no'),
            );

            return rest_ensure_response($settings);
        }

        /**
         * PUT: Update shipping settings
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function update_shipping_settings(WP_REST_Request $request)
        {
            $params = $request->get_json_params();
            $allowed_settings = array(
                'woocommerce_enable_shipping_calc',
                'woocommerce_shipping_cost_requires_address',
                'woocommerce_ship_to_destination',
                'woocommerce_shipping_debug_mode',
            );

            foreach ($allowed_settings as $setting_key) {
                if (isset($params[$setting_key])) {
                    $value = sanitize_text_field($params[$setting_key]);

                    // Validate ship_to_destination values
                    if ($setting_key === 'woocommerce_ship_to_destination') {
                        if (!in_array($value, array('billing', 'shipping', 'billing_only'), true)) {
                            $value = 'billing';
                        }
                    }
                    // Validate yes/no values
                    elseif (in_array($setting_key, array(
                        'woocommerce_enable_shipping_calc',
                        'woocommerce_shipping_cost_requires_address',
                        'woocommerce_shipping_debug_mode'
                    ), true)) {
                        $value = $value === 'yes' ? 'yes' : 'no';
                    }

                    update_option($setting_key, $value);
                }
            }

            // Return updated settings
            return $this->get_shipping_settings($request);
        }

        // ==================== Shipping Classes ====================

        /**
         * GET: Retrieve all shipping classes
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function get_shipping_classes(WP_REST_Request $request)
        {
            $classes = WC()->shipping()->get_shipping_classes();
            $result = array();

            foreach ($classes as $class) {
                $result[] = array(
                    'term_id'     => $class->term_id,
                    'name'        => $class->name,
                    'slug'        => $class->slug,
                    'description' => $class->description,
                    'count'       => $class->count,
                );
            }

            return rest_ensure_response($result);
        }

        /**
         * POST: Create new shipping class
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function create_shipping_class(WP_REST_Request $request)
        {
            $params = $request->get_json_params();

            if (empty($params['name'])) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'Name is required',
                ));
            }

            $name = sanitize_text_field($params['name']);
            $slug = isset($params['slug']) ? sanitize_title($params['slug']) : sanitize_title($name);
            $description = isset($params['description']) ? sanitize_textarea_field($params['description']) : '';

            // Check if slug already exists
            $existing = get_term_by('slug', $slug, 'product_shipping_class');
            if ($existing) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'A shipping class with this slug already exists',
                ));
            }

            $result = wp_insert_term($name, 'product_shipping_class', array(
                'slug'        => $slug,
                'description' => $description,
            ));

            if (is_wp_error($result)) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => $result->get_error_message(),
                ));
            }

            $term = get_term($result['term_id'], 'product_shipping_class');

            return rest_ensure_response(array(
                'success' => true,
                'class'   => array(
                    'term_id'     => $term->term_id,
                    'name'        => $term->name,
                    'slug'        => $term->slug,
                    'description' => $term->description,
                    'count'       => $term->count,
                ),
            ));
        }

        /**
         * PUT: Update shipping class
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function update_shipping_class(WP_REST_Request $request)
        {
            $class_id = absint($request['id']);
            $params = $request->get_json_params();

            $term = get_term($class_id, 'product_shipping_class');

            if (!$term || is_wp_error($term)) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'Shipping class not found',
                ));
            }

            $args = array();

            if (isset($params['name'])) {
                $args['name'] = sanitize_text_field($params['name']);
            }

            if (isset($params['slug'])) {
                $new_slug = sanitize_title($params['slug']);
                // Check if slug already exists (and it's not this term)
                $existing = get_term_by('slug', $new_slug, 'product_shipping_class');
                if ($existing && $existing->term_id != $class_id) {
                    return rest_ensure_response(array(
                        'success' => false,
                        'error'   => 'A shipping class with this slug already exists',
                    ));
                }
                $args['slug'] = $new_slug;
            }

            if (isset($params['description'])) {
                $args['description'] = sanitize_textarea_field($params['description']);
            }

            if (!empty($args)) {
                $result = wp_update_term($class_id, 'product_shipping_class', $args);

                if (is_wp_error($result)) {
                    return rest_ensure_response(array(
                        'success' => false,
                        'error'   => $result->get_error_message(),
                    ));
                }
            }

            $updated_term = get_term($class_id, 'product_shipping_class');

            return rest_ensure_response(array(
                'success' => true,
                'class'   => array(
                    'term_id'     => $updated_term->term_id,
                    'name'        => $updated_term->name,
                    'slug'        => $updated_term->slug,
                    'description' => $updated_term->description,
                    'count'       => $updated_term->count,
                ),
            ));
        }

        /**
         * DELETE: Delete shipping class
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function delete_shipping_class(WP_REST_Request $request)
        {
            $class_id = absint($request['id']);

            $term = get_term($class_id, 'product_shipping_class');

            if (!$term || is_wp_error($term)) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'Shipping class not found',
                ));
            }

            $result = wp_delete_term($class_id, 'product_shipping_class');

            if (is_wp_error($result)) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => $result->get_error_message(),
                ));
            }

            return rest_ensure_response(array(
                'success' => true,
            ));
        }

        // ==================== Local Pickup ====================

        /**
         * GET: Retrieve local pickup settings
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function get_local_pickup_settings(WP_REST_Request $request)
        {
            $settings = array(
                'enabled' => get_option('whizmanage_local_pickup_enabled', 'no'),
                'title'   => get_option('whizmanage_local_pickup_title', __('Local Pickup', 'whizmanage')),
                'cost'    => get_option('whizmanage_local_pickup_cost', ''),
            );

            return rest_ensure_response($settings);
        }

        /**
         * PUT: Update local pickup settings
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function update_local_pickup_settings(WP_REST_Request $request)
        {
            $params = $request->get_json_params();

            if (isset($params['enabled'])) {
                $enabled = $params['enabled'] === 'yes' ? 'yes' : 'no';
                update_option('whizmanage_local_pickup_enabled', $enabled);
            }

            if (isset($params['title'])) {
                update_option('whizmanage_local_pickup_title', sanitize_text_field($params['title']));
            }

            if (isset($params['cost'])) {
                update_option('whizmanage_local_pickup_cost', sanitize_text_field($params['cost']));
            }

            return $this->get_local_pickup_settings($request);
        }

        /**
         * GET: Retrieve all pickup locations
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function get_pickup_locations(WP_REST_Request $request)
        {
            $locations = get_option('whizmanage_pickup_locations', array());

            // Ensure locations is an array
            if (!is_array($locations)) {
                $locations = array();
            }

            return rest_ensure_response($locations);
        }

        /**
         * POST: Create new pickup location
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function create_pickup_location(WP_REST_Request $request)
        {
            $params = $request->get_json_params();

            if (empty($params['name'])) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'Location name is required',
                ));
            }

            $locations = get_option('whizmanage_pickup_locations', array());

            if (!is_array($locations)) {
                $locations = array();
            }

            // Generate unique ID
            $max_id = 0;
            foreach ($locations as $location) {
                if (isset($location['id']) && $location['id'] > $max_id) {
                    $max_id = $location['id'];
                }
            }
            $new_id = $max_id + 1;

            $new_location = array(
                'id'       => $new_id,
                'name'     => sanitize_text_field($params['name']),
                'address'  => isset($params['address']) ? sanitize_text_field($params['address']) : '',
                'city'     => isset($params['city']) ? sanitize_text_field($params['city']) : '',
                'state'    => isset($params['state']) ? sanitize_text_field($params['state']) : '',
                'postcode' => isset($params['postcode']) ? sanitize_text_field($params['postcode']) : '',
                'country'  => isset($params['country']) ? sanitize_text_field($params['country']) : '',
                'phone'    => isset($params['phone']) ? sanitize_text_field($params['phone']) : '',
                'hours'    => isset($params['hours']) ? sanitize_text_field($params['hours']) : '',
                'details'  => isset($params['details']) ? sanitize_textarea_field($params['details']) : '',
            );

            $locations[] = $new_location;
            update_option('whizmanage_pickup_locations', $locations);

            return rest_ensure_response(array(
                'success'  => true,
                'location' => $new_location,
            ));
        }

        /**
         * PUT: Update pickup location
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function update_pickup_location(WP_REST_Request $request)
        {
            $location_id = absint($request['id']);
            $params = $request->get_json_params();

            $locations = get_option('whizmanage_pickup_locations', array());

            if (!is_array($locations)) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'Location not found',
                ));
            }

            $found = false;
            $updated_location = null;

            foreach ($locations as $key => $location) {
                if (isset($location['id']) && $location['id'] == $location_id) {
                    $found = true;

                    if (isset($params['name'])) {
                        $locations[$key]['name'] = sanitize_text_field($params['name']);
                    }
                    if (isset($params['address'])) {
                        $locations[$key]['address'] = sanitize_text_field($params['address']);
                    }
                    if (isset($params['city'])) {
                        $locations[$key]['city'] = sanitize_text_field($params['city']);
                    }
                    if (isset($params['state'])) {
                        $locations[$key]['state'] = sanitize_text_field($params['state']);
                    }
                    if (isset($params['postcode'])) {
                        $locations[$key]['postcode'] = sanitize_text_field($params['postcode']);
                    }
                    if (isset($params['country'])) {
                        $locations[$key]['country'] = sanitize_text_field($params['country']);
                    }
                    if (isset($params['phone'])) {
                        $locations[$key]['phone'] = sanitize_text_field($params['phone']);
                    }
                    if (isset($params['hours'])) {
                        $locations[$key]['hours'] = sanitize_text_field($params['hours']);
                    }
                    if (isset($params['details'])) {
                        $locations[$key]['details'] = sanitize_textarea_field($params['details']);
                    }

                    $updated_location = $locations[$key];
                    break;
                }
            }

            if (!$found) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'Location not found',
                ));
            }

            update_option('whizmanage_pickup_locations', $locations);

            return rest_ensure_response(array(
                'success'  => true,
                'location' => $updated_location,
            ));
        }

        /**
         * DELETE: Delete pickup location
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function delete_pickup_location(WP_REST_Request $request)
        {
            $location_id = absint($request['id']);

            $locations = get_option('whizmanage_pickup_locations', array());

            if (!is_array($locations)) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'Location not found',
                ));
            }

            $found = false;
            $new_locations = array();

            foreach ($locations as $location) {
                if (isset($location['id']) && $location['id'] == $location_id) {
                    $found = true;
                    continue; // Skip this location (delete it)
                }
                $new_locations[] = $location;
            }

            if (!$found) {
                return rest_ensure_response(array(
                    'success' => false,
                    'error'   => 'Location not found',
                ));
            }

            update_option('whizmanage_pickup_locations', $new_locations);

            return rest_ensure_response(array(
                'success' => true,
            ));
        }

        /**
         * Check permissions for shipping management
         *
         * @return bool|WP_Error
         */
        public function permissions_check()
        {
            if (current_user_can('manage_options') || current_user_can('manage_woocommerce') || current_user_can('use_whizmanage')) {
                return true;
            }

            return new WP_Error(
                'rest_forbidden',
                esc_html__('You do not have permissions to manage shipping settings.', 'whizmanage'),
                array('status' => 403)
            );
        }
    }
}
