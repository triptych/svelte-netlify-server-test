
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/Components/Header.svelte generated by Svelte v3.12.1 */

    const file = "src/Components/Header.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.option = list[i];
    	return child_ctx;
    }

    // (69:4) {#each menuOptions as option}
    function create_each_block(ctx) {
    	var li, t0_value = ctx.option.title + "", t0, t1, li_class_value, dispose;

    	function click_handler() {
    		return ctx.click_handler(ctx);
    	}

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(li, "class", li_class_value = "menuItem" + (ctx.option.active ? ' active' : '') + " svelte-16890ol");
    			add_location(li, file, 69, 6, 1297);
    			dispose = listen_dev(li, "click", click_handler);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if ((changed.menuOptions) && t0_value !== (t0_value = ctx.option.title + "")) {
    				set_data_dev(t0, t0_value);
    			}

    			if ((changed.menuOptions) && li_class_value !== (li_class_value = "menuItem" + (ctx.option.active ? ' active' : '') + " svelte-16890ol")) {
    				attr_dev(li, "class", li_class_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(li);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block.name, type: "each", source: "(69:4) {#each menuOptions as option}", ctx });
    	return block;
    }

    function create_fragment(ctx) {
    	var div, ul, li, img, t;

    	let each_value = ctx.menuOptions;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			ul = element("ul");
    			li = element("li");
    			img = element("img");
    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr_dev(img, "src", logoUrl);
    			attr_dev(img, "alt", "logo");
    			add_location(img, file, 67, 21, 1219);
    			attr_dev(li, "class", "logo svelte-16890ol");
    			add_location(li, file, 67, 4, 1202);
    			attr_dev(ul, "class", "menu svelte-16890ol");
    			add_location(ul, file, 66, 2, 1180);
    			attr_dev(div, "class", "header svelte-16890ol");
    			add_location(div, file, 65, 0, 1157);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, ul);
    			append_dev(ul, li);
    			append_dev(li, img);
    			append_dev(ul, t);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},

    		p: function update(changed, ctx) {
    			if (changed.menuOptions) {
    				each_value = ctx.menuOptions;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    const logoUrl = 'http://placehold.it/180x60';

    function instance($$self, $$props, $$invalidate) {
    	
      let menuOptions = [
        {
          title: 'Option 1',
          url: '#',
          active: false
        },
        {
          title: 'Option 2',
          url: '#',
          active: false
        },
        {
          title: 'Option 3',
          url: '#',
          active: false
        }
      ];

      const setActivate = ({ title }) => {
        $$invalidate('menuOptions', menuOptions = menuOptions.map(item => ({
          ...item,
          active: item.title === title
        })));
      };

    	const click_handler = ({ option }) => setActivate(option);

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('menuOptions' in $$props) $$invalidate('menuOptions', menuOptions = $$props.menuOptions);
    	};

    	return { menuOptions, setActivate, click_handler };
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Header", options, id: create_fragment.name });
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const cart = writable(0);

    /* src/Components/Product.svelte generated by Svelte v3.12.1 */

    const file$1 = "src/Components/Product.svelte";

    // (58:4) {#if product.stock < 5}
    function create_if_block(ctx) {
    	var strong;

    	const block = {
    		c: function create() {
    			strong = element("strong");
    			strong.textContent = "¡Hurry up!";
    			add_location(strong, file$1, 58, 6, 1178);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, strong, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(strong);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(58:4) {#if product.stock < 5}", ctx });
    	return block;
    }

    function create_fragment$1(ctx) {
    	var div3, picture, img, img_src_value, t0, div0, h1, t1_value = ctx.product.name + "", t1, t2, h3, t3_value = ctx.product.description + "", t3, t4, div1, p, t5_value = ctx.product.price + "", t5, t6, t7, div2, button, dispose;

    	var if_block = (ctx.product.stock < 5) && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			picture = element("picture");
    			img = element("img");
    			t0 = space();
    			div0 = element("div");
    			h1 = element("h1");
    			t1 = text(t1_value);
    			t2 = space();
    			h3 = element("h3");
    			t3 = text(t3_value);
    			t4 = space();
    			div1 = element("div");
    			p = element("p");
    			t5 = text(t5_value);
    			t6 = space();
    			if (if_block) if_block.c();
    			t7 = space();
    			div2 = element("div");
    			button = element("button");
    			button.textContent = "Add to cart";
    			attr_dev(img, "src", img_src_value = ctx.product.image);
    			attr_dev(img, "alt", "");
    			add_location(img, file$1, 49, 4, 938);
    			add_location(picture, file$1, 48, 2, 924);
    			add_location(h1, file$1, 52, 4, 1019);
    			add_location(h3, file$1, 53, 4, 1047);
    			attr_dev(div0, "class", "product-info svelte-13nimqt");
    			add_location(div0, file$1, 51, 2, 988);
    			attr_dev(p, "class", "svelte-13nimqt");
    			add_location(p, file$1, 56, 4, 1121);
    			attr_dev(div1, "class", "product-price svelte-13nimqt");
    			add_location(div1, file$1, 55, 2, 1089);
    			attr_dev(button, "class", "svelte-13nimqt");
    			add_location(button, file$1, 62, 4, 1255);
    			attr_dev(div2, "class", "addtocart svelte-13nimqt");
    			add_location(div2, file$1, 61, 2, 1227);
    			attr_dev(div3, "class", "product svelte-13nimqt");
    			add_location(div3, file$1, 47, 0, 900);
    			dispose = listen_dev(button, "click", ctx.setCart);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, picture);
    			append_dev(picture, img);
    			append_dev(div3, t0);
    			append_dev(div3, div0);
    			append_dev(div0, h1);
    			append_dev(h1, t1);
    			append_dev(div0, t2);
    			append_dev(div0, h3);
    			append_dev(h3, t3);
    			append_dev(div3, t4);
    			append_dev(div3, div1);
    			append_dev(div1, p);
    			append_dev(p, t5);
    			append_dev(div1, t6);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div3, t7);
    			append_dev(div3, div2);
    			append_dev(div2, button);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.product) && img_src_value !== (img_src_value = ctx.product.image)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if ((changed.product) && t1_value !== (t1_value = ctx.product.name + "")) {
    				set_data_dev(t1, t1_value);
    			}

    			if ((changed.product) && t3_value !== (t3_value = ctx.product.description + "")) {
    				set_data_dev(t3, t3_value);
    			}

    			if ((changed.product) && t5_value !== (t5_value = ctx.product.price + "")) {
    				set_data_dev(t5, t5_value);
    			}

    			if (ctx.product.stock < 5) {
    				if (!if_block) {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div3);
    			}

    			if (if_block) if_block.d();
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { product = {} } = $$props;

      const setCart = () => cart.update(total => total + 1);

    	const writable_props = ['product'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Product> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('product' in $$props) $$invalidate('product', product = $$props.product);
    	};

    	$$self.$capture_state = () => {
    		return { product };
    	};

    	$$self.$inject_state = $$props => {
    		if ('product' in $$props) $$invalidate('product', product = $$props.product);
    	};

    	return { product, setCart };
    }

    class Product extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["product"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Product", options, id: create_fragment$1.name });
    	}

    	get product() {
    		throw new Error("<Product>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set product(value) {
    		throw new Error("<Product>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Components/ContentBox.svelte generated by Svelte v3.12.1 */

    const file$2 = "src/Components/ContentBox.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.product = list[i];
    	return child_ctx;
    }

    // (33:4) {#if total > 0}
    function create_if_block$1(ctx) {
    	var a, dispose;

    	const block = {
    		c: function create() {
    			a = element("a");
    			a.textContent = "Click to remove an item from cart";
    			attr_dev(a, "href", "javascript:void(0)");
    			add_location(a, file$2, 33, 6, 613);
    			dispose = listen_dev(a, "click", ctx.removeItem);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$1.name, type: "if", source: "(33:4) {#if total > 0}", ctx });
    	return block;
    }

    // (40:4) {#each products as product}
    function create_each_block$1(ctx) {
    	var current;

    	var product = new Product({
    		props: { product: ctx.product },
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			product.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(product, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var product_changes = {};
    			if (changed.products) product_changes.product = ctx.product;
    			product.$set(product_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(product.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(product.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(product, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$1.name, type: "each", source: "(40:4) {#each products as product}", ctx });
    	return block;
    }

    function create_fragment$2(ctx) {
    	var div2, h1, t1, div0, h3, t2, t3, t4, t5, t6, div1, current;

    	var if_block = (ctx.total > 0) && create_if_block$1(ctx);

    	let each_value = ctx.products;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Product list";
    			t1 = space();
    			div0 = element("div");
    			h3 = element("h3");
    			t2 = text("You have ");
    			t3 = text(ctx.total);
    			t4 = text(" products in the cart");
    			t5 = space();
    			if (if_block) if_block.c();
    			t6 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			add_location(h1, file$2, 29, 2, 493);
    			add_location(h3, file$2, 31, 4, 540);
    			attr_dev(div0, "class", "cart");
    			add_location(div0, file$2, 30, 2, 517);
    			attr_dev(div1, "class", "product-cotainer svelte-spiph6");
    			add_location(div1, file$2, 38, 2, 739);
    			attr_dev(div2, "class", "content-box svelte-spiph6");
    			add_location(div2, file$2, 28, 0, 465);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h1);
    			append_dev(div2, t1);
    			append_dev(div2, div0);
    			append_dev(div0, h3);
    			append_dev(h3, t2);
    			append_dev(h3, t3);
    			append_dev(h3, t4);
    			append_dev(div0, t5);
    			if (if_block) if_block.m(div0, null);
    			append_dev(div2, t6);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!current || changed.total) {
    				set_data_dev(t3, ctx.total);
    			}

    			if (ctx.total > 0) {
    				if (!if_block) {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (changed.products) {
    				each_value = ctx.products;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, null);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div2);
    			}

    			if (if_block) if_block.d();

    			destroy_each(each_blocks, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	

      let { products = [] } = $$props;

      let total = 0;

      cart.subscribe(c => {
        $$invalidate('total', total = c);
      });

      const removeItem = () => cart.update(c => c - 1);

    	const writable_props = ['products'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<ContentBox> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('products' in $$props) $$invalidate('products', products = $$props.products);
    	};

    	$$self.$capture_state = () => {
    		return { products, total };
    	};

    	$$self.$inject_state = $$props => {
    		if ('products' in $$props) $$invalidate('products', products = $$props.products);
    		if ('total' in $$props) $$invalidate('total', total = $$props.total);
    	};

    	return { products, total, removeItem };
    }

    class ContentBox extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, ["products"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "ContentBox", options, id: create_fragment$2.name });
    	}

    	get products() {
    		throw new Error("<ContentBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set products(value) {
    		throw new Error("<ContentBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var productsJson = [
        {
          "name": "Product 1",
          "description": "This is a great product",
          "price": "$5.00",
          "stock": 5,
          "image": "http://placehold.it/150x110"
        },
        {
          "name": "Product 2",
          "description": "Has many recommendations",
          "price": "$2.40",
          "stock": 2,
          "image": "http://placehold.it/150x110"
        },
        {
          "name": "Product 3",
          "description": "Don't lose this opportunity",
          "price": "$90.00",
          "stock": 10,
          "image": "http://placehold.it/150x110"
        }
      ];

    /* src/Views/Home.svelte generated by Svelte v3.12.1 */

    const file$3 = "src/Views/Home.svelte";

    function create_fragment$3(ctx) {
    	var div, t, current;

    	var header = new Header({ $$inline: true });

    	var contentbox = new ContentBox({
    		props: { products: ctx.products },
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			div = element("div");
    			header.$$.fragment.c();
    			t = space();
    			contentbox.$$.fragment.c();
    			attr_dev(div, "class", "container-home");
    			add_location(div, file$3, 13, 0, 284);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(header, div, null);
    			append_dev(div, t);
    			mount_component(contentbox, div, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var contentbox_changes = {};
    			if (changed.products) contentbox_changes.products = ctx.products;
    			contentbox.$set(contentbox_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);

    			transition_in(contentbox.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(contentbox.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			destroy_component(header);

    			destroy_component(contentbox);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$3.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	

      let products;

      onMount(() => {
        $$invalidate('products', products = productsJson);
      });

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('products' in $$props) $$invalidate('products', products = $$props.products);
    	};

    	return { products };
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Home", options, id: create_fragment$3.name });
    	}
    }

    /* src/App.svelte generated by Svelte v3.12.1 */

    function create_fragment$4(ctx) {
    	var current;

    	var homelayout = new Home({ $$inline: true });

    	const block = {
    		c: function create() {
    			homelayout.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(homelayout, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(homelayout.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(homelayout.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(homelayout, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$4.name, type: "component", source: "", ctx });
    	return block;
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$4, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$4.name });
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
