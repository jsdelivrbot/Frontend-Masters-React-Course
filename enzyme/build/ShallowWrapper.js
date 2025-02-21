Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _flatten = require('lodash/flatten');

var _flatten2 = _interopRequireDefault(_flatten);

var _uniq = require('lodash/uniq');

var _uniq2 = _interopRequireDefault(_uniq);

var _compact = require('lodash/compact');

var _compact2 = _interopRequireDefault(_compact);

var _cheerio = require('cheerio');

var _cheerio2 = _interopRequireDefault(_cheerio);

var _object = require('object.assign');

var _object2 = _interopRequireDefault(_object);

var _ComplexSelector = require('./ComplexSelector');

var _ComplexSelector2 = _interopRequireDefault(_ComplexSelector);

var _Utils = require('./Utils');

var _Debug = require('./Debug');

var _ShallowTraversal = require('./ShallowTraversal');

var _reactCompat = require('./react-compat');

var _version = require('./version');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Finds all nodes in the current wrapper nodes' render trees that match the provided predicate
 * function.
 *
 * @param {ShallowWrapper} wrapper
 * @param {Function} predicate
 * @param {Function} filter
 * @returns {ShallowWrapper}
 */
function findWhereUnwrapped(wrapper, predicate) {
  var filter = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _ShallowTraversal.treeFilter;

  return wrapper.flatMap(function (n) {
    return filter(n.getNode(), predicate);
  });
}

/**
 * Returns a new wrapper instance with only the nodes of the current wrapper instance that match
 * the provided predicate function.
 *
 * @param {ShallowWrapper} wrapper
 * @param {Function} predicate
 * @returns {ShallowWrapper}
 */
function filterWhereUnwrapped(wrapper, predicate) {
  return wrapper.wrap((0, _compact2['default'])(wrapper.getNodes().filter(predicate)));
}

/**
 * Ensure options passed to ShallowWrapper are valid. Throws otherwise.
 * @param {Object} options
 */
function validateOptions(options) {
  var lifecycleExperimental = options.lifecycleExperimental,
      disableLifecycleMethods = options.disableLifecycleMethods;

  if (typeof lifecycleExperimental !== 'undefined' && typeof lifecycleExperimental !== 'boolean') {
    throw new Error('lifecycleExperimental must be either true or false if provided');
  }

  if (typeof disableLifecycleMethods !== 'undefined' && typeof disableLifecycleMethods !== 'boolean') {
    throw new Error('disableLifecycleMethods must be either true or false if provided');
  }

  if (lifecycleExperimental != null && disableLifecycleMethods != null && lifecycleExperimental === disableLifecycleMethods) {
    throw new Error('lifecycleExperimental and disableLifecycleMethods cannot be set to the same value');
  }
}

function performBatchedUpdates(wrapper, fn) {
  var renderer = wrapper.root.renderer;
  if (_version.REACT155 && renderer.unstable_batchedUpdates) {
    // React 15.5+ exposes batching on shallow renderer itself
    return renderer.unstable_batchedUpdates(fn);
  }
  // React <15.5: Fallback to ReactDOM
  return (0, _reactCompat.batchedUpdates)(fn);
}

/**
 * @class ShallowWrapper
 */

var ShallowWrapper = function () {
  function ShallowWrapper(nodes, root) {
    var _this = this;

    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    _classCallCheck(this, ShallowWrapper);

    validateOptions(options);
    if (!root) {
      this.root = this;
      this.unrendered = nodes;
      this.renderer = (0, _reactCompat.createShallowRenderer)();
      (0, _Utils.withSetStateAllowed)(function () {
        performBatchedUpdates(_this, function () {
          _this.renderer.render(nodes, options.context);
          var instance = _this.instance();
          if (options.lifecycleExperimental && instance && typeof instance.componentDidMount === 'function') {
            instance.componentDidMount();
          }
        });
      });
      this.node = this.renderer.getRenderOutput();
      this.nodes = [this.node];
      this.length = 1;
    } else {
      this.root = root;
      this.unrendered = null;
      this.renderer = null;
      if (!Array.isArray(nodes)) {
        this.node = nodes;
        this.nodes = [nodes];
      } else {
        this.node = nodes[0];
        this.nodes = nodes;
      }
      this.length = this.nodes.length;
    }
    this.options = options;
    this.complexSelector = new _ComplexSelector2['default'](_ShallowTraversal.buildPredicate, findWhereUnwrapped, _ShallowTraversal.childrenOfNode);
  }

  /**
   * Returns the wrapped ReactElement.
   *
   * @return {ReactElement}
   */


  _createClass(ShallowWrapper, [{
    key: 'getNode',
    value: function () {
      function getNode() {
        if (this.length !== 1) {
          throw new Error('ShallowWrapper::getNode() can only be called when wrapping one node');
        }
        return this.root === this ? this.renderer.getRenderOutput() : this.node;
      }

      return getNode;
    }()

    /**
     * Returns the wrapped ReactElements.
     *
     * @return {Array<ReactElement>}
     */

  }, {
    key: 'getNodes',
    value: function () {
      function getNodes() {
        return this.root === this ? [this.renderer.getRenderOutput()] : this.nodes;
      }

      return getNodes;
    }()

    /**
     * Gets the instance of the component being rendered as the root node passed into `shallow()`.
     *
     * NOTE: can only be called on a wrapper instance that is also the root instance.
     *
     * Example:
     * ```
     * const wrapper = shallow(<MyComponent />);
     * const inst = wrapper.instance();
     * expect(inst).to.be.instanceOf(MyComponent);
     * ```
     * @returns {ReactComponent}
     */

  }, {
    key: 'instance',
    value: function () {
      function instance() {
        if (this.root !== this) {
          throw new Error('ShallowWrapper::instance() can only be called on the root');
        }
        return this.renderer._instance ? this.renderer._instance._instance : null;
      }

      return instance;
    }()

    /**
     * Forces a re-render. Useful to run before checking the render output if something external
     * may be updating the state of the component somewhere.
     *
     * NOTE: can only be called on a wrapper instance that is also the root instance.
     *
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'update',
    value: function () {
      function update() {
        var _this2 = this;

        if (this.root !== this) {
          throw new Error('ShallowWrapper::update() can only be called on the root');
        }
        this.single('update', function () {
          _this2.node = _this2.renderer.getRenderOutput();
          _this2.nodes = [_this2.node];
        });
        return this;
      }

      return update;
    }()

    /**
     * A method is for re-render with new props and context.
     * This calls componentDidUpdate method if lifecycleExperimental is enabled.
     *
     * NOTE: can only be called on a wrapper instance that is also the root instance.
     *
     * @param {Object} props
     * @param {Object} context
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'rerender',
    value: function () {
      function rerender(props, context) {
        var _this3 = this;

        this.single('rerender', function () {
          (0, _Utils.withSetStateAllowed)(function () {
            var instance = _this3.instance();
            var state = instance.state;
            var prevProps = instance.props;
            var prevContext = instance.context;
            var nextProps = props || prevProps;
            var nextContext = context || prevContext;
            performBatchedUpdates(_this3, function () {
              var shouldRender = true;
              // dirty hack:
              // make sure that componentWillReceiveProps is called before shouldComponentUpdate
              var originalComponentWillReceiveProps = void 0;
              if (_this3.options.lifecycleExperimental && instance && typeof instance.componentWillReceiveProps === 'function') {
                instance.componentWillReceiveProps(nextProps, nextContext);
                originalComponentWillReceiveProps = instance.componentWillReceiveProps;
                instance.componentWillReceiveProps = function () {};
              }
              // dirty hack: avoid calling shouldComponentUpdate twice
              var originalShouldComponentUpdate = void 0;
              if (_this3.options.lifecycleExperimental && instance && typeof instance.shouldComponentUpdate === 'function') {
                shouldRender = instance.shouldComponentUpdate(nextProps, state, nextContext);
                originalShouldComponentUpdate = instance.shouldComponentUpdate;
              }
              if (shouldRender) {
                if (props) _this3.unrendered = _react2['default'].cloneElement(_this3.unrendered, props);
                if (originalShouldComponentUpdate) {
                  instance.shouldComponentUpdate = function () {
                    return true;
                  };
                }

                _this3.renderer.render(_this3.unrendered, nextContext);

                if (originalShouldComponentUpdate) {
                  instance.shouldComponentUpdate = originalShouldComponentUpdate;
                }
                if (_this3.options.lifecycleExperimental && instance && typeof instance.componentDidUpdate === 'function') {
                  instance.componentDidUpdate(prevProps, state, prevContext);
                }
                _this3.update();
                // If it doesn't need to rerender, update only its props.
              } else if (props) {
                instance.props = props;
              }
              if (originalComponentWillReceiveProps) {
                instance.componentWillReceiveProps = originalComponentWillReceiveProps;
              }
            });
          });
        });
        return this;
      }

      return rerender;
    }()

    /**
     * A method that sets the props of the root component, and re-renders. Useful for when you are
     * wanting to test how the component behaves over time with changing props. Calling this, for
     * instance, will call the `componentWillReceiveProps` lifecycle method.
     *
     * Similar to `setState`, this method accepts a props object and will merge it in with the already
     * existing props.
     *
     * NOTE: can only be called on a wrapper instance that is also the root instance.
     *
     * @param {Object} props object
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'setProps',
    value: function () {
      function setProps(props) {
        if (this.root !== this) {
          throw new Error('ShallowWrapper::setProps() can only be called on the root');
        }
        return this.rerender(props);
      }

      return setProps;
    }()

    /**
     * A method to invoke `setState` on the root component instance similar to how you might in the
     * definition of the component, and re-renders.  This method is useful for testing your component
     * in hard to achieve states, however should be used sparingly. If possible, you should utilize
     * your component's external API in order to get it into whatever state you want to test, in order
     * to be as accurate of a test as possible. This is not always practical, however.
     *
     * NOTE: can only be called on a wrapper instance that is also the root instance.
     *
     * @param {Object} state to merge
     * @param {Function} cb - callback function
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'setState',
    value: function () {
      function setState(state) {
        var _this4 = this;

        var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;

        if (this.root !== this) {
          throw new Error('ShallowWrapper::setState() can only be called on the root');
        }
        if ((0, _Utils.isFunctionalComponent)(this.instance())) {
          throw new Error('ShallowWrapper::setState() can only be called on class components');
        }
        this.single('setState', function () {
          (0, _Utils.withSetStateAllowed)(function () {
            _this4.instance().setState(state, callback);
            _this4.update();
          });
        });
        return this;
      }

      return setState;
    }()

    /**
     * A method that sets the context of the root component, and re-renders. Useful for when you are
     * wanting to test how the component behaves over time with changing contexts.
     *
     * NOTE: can only be called on a wrapper instance that is also the root instance.
     *
     * @param {Object} context object
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'setContext',
    value: function () {
      function setContext(context) {
        if (this.root !== this) {
          throw new Error('ShallowWrapper::setContext() can only be called on the root');
        }
        if (!this.options.context) {
          throw new Error('ShallowWrapper::setContext() can only be called on a wrapper that was originally passed ' + 'a context option');
        }
        return this.rerender(null, context);
      }

      return setContext;
    }()

    /**
     * Whether or not a given react element exists in the shallow render tree.
     *
     * Example:
     * ```
     * const wrapper = shallow(<MyComponent />);
     * expect(wrapper.contains(<div className="foo bar" />)).to.equal(true);
     * ```
     *
     * @param {ReactElement|Array<ReactElement>} nodeOrNodes
     * @returns {Boolean}
     */

  }, {
    key: 'contains',
    value: function () {
      function contains(nodeOrNodes) {
        if (!(0, _Utils.isReactElementAlike)(nodeOrNodes)) {
          throw new Error('ShallowWrapper::contains() can only be called with ReactElement (or array of them), ' + 'string or number as argument.');
        }

        var predicate = Array.isArray(nodeOrNodes) ? function (other) {
          return (0, _Utils.containsChildrenSubArray)(_Utils.nodeEqual, other, nodeOrNodes);
        } : function (other) {
          return (0, _Utils.nodeEqual)(nodeOrNodes, other);
        };

        return findWhereUnwrapped(this, predicate).length > 0;
      }

      return contains;
    }()

    /**
     * Whether or not a given react element exists in the shallow render tree.
     * Match is based on the expected element and not on wrappers element.
     * It will determine if one of the wrappers element "looks like" the expected
     * element by checking if all props of the expected element are present
     * on the wrappers element and equals to each other.
     *
     * Example:
     * ```
     * // MyComponent outputs <div><div class="foo">Hello</div></div>
     * const wrapper = shallow(<MyComponent />);
     * expect(wrapper.containsMatchingElement(<div>Hello</div>)).to.equal(true);
     * ```
     *
     * @param {ReactElement} node
     * @returns {Boolean}
     */

  }, {
    key: 'containsMatchingElement',
    value: function () {
      function containsMatchingElement(node) {
        var predicate = function () {
          function predicate(other) {
            return (0, _Utils.nodeMatches)(node, other, function (a, b) {
              return a <= b;
            });
          }

          return predicate;
        }();
        return findWhereUnwrapped(this, predicate).length > 0;
      }

      return containsMatchingElement;
    }()

    /**
     * Whether or not all the given react elements exists in the shallow render tree.
     * Match is based on the expected element and not on wrappers element.
     * It will determine if one of the wrappers element "looks like" the expected
     * element by checking if all props of the expected element are present
     * on the wrappers element and equals to each other.
     *
     * Example:
     * ```
     * const wrapper = shallow(<MyComponent />);
     * expect(wrapper.containsAllMatchingElements([
     *   <div>Hello</div>,
     *   <div>Goodbye</div>,
     * ])).to.equal(true);
     * ```
     *
     * @param {Array<ReactElement>} nodes
     * @returns {Boolean}
     */

  }, {
    key: 'containsAllMatchingElements',
    value: function () {
      function containsAllMatchingElements(nodes) {
        var invertedEquals = function () {
          function invertedEquals(n1, n2) {
            return (0, _Utils.nodeMatches)(n2, n1, function (a, b) {
              return a <= b;
            });
          }

          return invertedEquals;
        }();
        var predicate = function () {
          function predicate(other) {
            return (0, _Utils.containsChildrenSubArray)(invertedEquals, other, nodes);
          }

          return predicate;
        }();
        return findWhereUnwrapped(this, predicate).length > 0;
      }

      return containsAllMatchingElements;
    }()

    /**
     * Whether or not one of the given react elements exists in the shallow render tree.
     * Match is based on the expected element and not on wrappers element.
     * It will determine if one of the wrappers element "looks like" the expected
     * element by checking if all props of the expected element are present
     * on the wrappers element and equals to each other.
     *
     * Example:
     * ```
     * const wrapper = shallow(<MyComponent />);
     * expect(wrapper.containsAnyMatchingElements([
     *   <div>Hello</div>,
     *   <div>Goodbye</div>,
     * ])).to.equal(true);
     * ```
     *
     * @param {Array<ReactElement>} nodes
     * @returns {Boolean}
     */

  }, {
    key: 'containsAnyMatchingElements',
    value: function () {
      function containsAnyMatchingElements(nodes) {
        var _this5 = this;

        return Array.isArray(nodes) && nodes.some(function (node) {
          return _this5.containsMatchingElement(node);
        });
      }

      return containsAnyMatchingElements;
    }()

    /**
     * Whether or not a given react element exists in the shallow render tree.
     *
     * Example:
     * ```
     * const wrapper = shallow(<MyComponent />);
     * expect(wrapper.contains(<div className="foo bar" />)).to.equal(true);
     * ```
     *
     * @param {ReactElement} node
     * @returns {Boolean}
     */

  }, {
    key: 'equals',
    value: function () {
      function equals(node) {
        var _this6 = this;

        return this.single('equals', function () {
          return (0, _Utils.nodeEqual)(_this6.getNode(), node);
        });
      }

      return equals;
    }()

    /**
     * Whether or not a given react element matches the shallow render tree.
     * Match is based on the expected element and not on wrapper root node.
     * It will determine if the wrapper root node "looks like" the expected
     * element by checking if all props of the expected element are present
     * on the wrapper root node and equals to each other.
     *
     * Example:
     * ```
     * // MyComponent outputs <div class="foo">Hello</div>
     * const wrapper = shallow(<MyComponent />);
     * expect(wrapper.matchesElement(<div>Hello</div>)).to.equal(true);
     * ```
     *
     * @param {ReactElement} node
     * @returns {Boolean}
     */

  }, {
    key: 'matchesElement',
    value: function () {
      function matchesElement(node) {
        var _this7 = this;

        return this.single('matchesElement', function () {
          return (0, _Utils.nodeMatches)(node, _this7.getNode(), function (a, b) {
            return a <= b;
          });
        });
      }

      return matchesElement;
    }()

    /**
     * Finds every node in the render tree of the current wrapper that matches the provided selector.
     *
     * @param {String|Function} selector
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'find',
    value: function () {
      function find(selector) {
        return this.complexSelector.find(selector, this);
      }

      return find;
    }()

    /**
     * Returns whether or not current node matches a provided selector.
     *
     * NOTE: can only be called on a wrapper of a single node.
     *
     * @param {String|Function} selector
     * @returns {boolean}
     */

  }, {
    key: 'is',
    value: function () {
      function is(selector) {
        var predicate = (0, _ShallowTraversal.buildPredicate)(selector);
        return this.single('is', function (n) {
          return predicate(n);
        });
      }

      return is;
    }()

    /**
     * Returns true if the component rendered nothing, i.e., null or false.
     *
     * @returns {boolean}
     */

  }, {
    key: 'isEmptyRender',
    value: function () {
      function isEmptyRender() {
        return this.type() === null;
      }

      return isEmptyRender;
    }()

    /**
     * Returns a new wrapper instance with only the nodes of the current wrapper instance that match
     * the provided predicate function. The predicate should receive a wrapped node as its first
     * argument.
     *
     * @param {Function} predicate
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'filterWhere',
    value: function () {
      function filterWhere(predicate) {
        var _this8 = this;

        return filterWhereUnwrapped(this, function (n) {
          return predicate(_this8.wrap(n));
        });
      }

      return filterWhere;
    }()

    /**
     * Returns a new wrapper instance with only the nodes of the current wrapper instance that match
     * the provided selector.
     *
     * @param {String|Function} selector
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'filter',
    value: function () {
      function filter(selector) {
        var predicate = (0, _ShallowTraversal.buildPredicate)(selector);
        return filterWhereUnwrapped(this, predicate);
      }

      return filter;
    }()

    /**
     * Returns a new wrapper instance with only the nodes of the current wrapper that did not match
     * the provided selector. Essentially the inverse of `filter`.
     *
     * @param {String|Function} selector
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'not',
    value: function () {
      function not(selector) {
        var predicate = (0, _ShallowTraversal.buildPredicate)(selector);
        return filterWhereUnwrapped(this, function (n) {
          return !predicate(n);
        });
      }

      return not;
    }()

    /**
     * Returns a string of the rendered text of the current render tree.  This function should be
     * looked at with skepticism if being used to test what the actual HTML output of the component
     * will be. If that is what you would like to test, use enzyme's `render` function instead.
     *
     * NOTE: can only be called on a wrapper of a single node.
     *
     * @returns {String}
     */

  }, {
    key: 'text',
    value: function () {
      function text() {
        return this.single('text', _ShallowTraversal.getTextFromNode);
      }

      return text;
    }()

    /**
     * Returns the HTML of the node.
     *
     * NOTE: can only be called on a wrapper of a single node.
     *
     * @returns {String}
     */

  }, {
    key: 'html',
    value: function () {
      function html() {
        var _this9 = this;

        return this.single('html', function (n) {
          return _this9.type() === null ? null : (0, _reactCompat.renderToStaticMarkup)(n);
        });
      }

      return html;
    }()

    /**
     * Returns the current node rendered to HTML and wrapped in a CheerioWrapper.
     *
     * NOTE: can only be called on a wrapper of a single node.
     *
     * @returns {CheerioWrapper}
     */

  }, {
    key: 'render',
    value: function () {
      function render() {
        return this.type() === null ? (0, _cheerio2['default'])() : _cheerio2['default'].load(this.html()).root();
      }

      return render;
    }()

    /**
     * A method that unmounts the component. This can be used to simulate a component going through
     * and unmount/mount lifecycle.
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'unmount',
    value: function () {
      function unmount() {
        this.renderer.unmount();
        return this;
      }

      return unmount;
    }()

    /**
     * Used to simulate events. Pass an eventname and (optionally) event arguments. This method of
     * testing events should be met with some skepticism.
     *
     * @param {String} event
     * @param {Array} args
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'simulate',
    value: function () {
      function simulate(event) {
        var _this10 = this;

        for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        var handler = this.prop((0, _Utils.propFromEvent)(event));
        if (handler) {
          (0, _Utils.withSetStateAllowed)(function () {
            // TODO(lmr): create/use synthetic events
            // TODO(lmr): emulate React's event propagation
            performBatchedUpdates(_this10, function () {
              handler.apply(undefined, args);
            });
            _this10.root.update();
          });
        }
        return this;
      }

      return simulate;
    }()

    /**
     * Returns the props hash for the current node of the wrapper.
     *
     * NOTE: can only be called on a wrapper of a single node.
     *
     * @returns {Object}
     */

  }, {
    key: 'props',
    value: function () {
      function props() {
        return this.single('props', _Utils.propsOfNode);
      }

      return props;
    }()

    /**
     * Returns the state hash for the root node of the wrapper. Optionally pass in a prop name and it
     * will return just that value.
     *
     * NOTE: can only be called on a wrapper of a single node.
     *
     * @param {String} name (optional)
     * @returns {*}
     */

  }, {
    key: 'state',
    value: function () {
      function state(name) {
        var _this11 = this;

        if (this.root !== this) {
          throw new Error('ShallowWrapper::state() can only be called on the root');
        }
        if ((0, _Utils.isFunctionalComponent)(this.instance())) {
          throw new Error('ShallowWrapper::state() can only be called on class components');
        }
        var _state = this.single('state', function () {
          return _this11.instance().state;
        });
        if (name !== undefined) {
          return _state[name];
        }
        return _state;
      }

      return state;
    }()

    /**
     * Returns the context hash for the root node of the wrapper.
     * Optionally pass in a prop name and it will return just that value.
     *
     * NOTE: can only be called on a wrapper of a single node.
     *
     * @param {String} name (optional)
     * @returns {*}
     */

  }, {
    key: 'context',
    value: function () {
      function context(name) {
        var _this12 = this;

        if (this.root !== this) {
          throw new Error('ShallowWrapper::context() can only be called on the root');
        }
        if (!this.options.context) {
          throw new Error('ShallowWrapper::context() can only be called on a wrapper that was originally passed ' + 'a context option');
        }
        var _context = this.single('context', function () {
          return _this12.instance().context;
        });
        if (name) {
          return _context[name];
        }
        return _context;
      }

      return context;
    }()

    /**
     * Returns a new wrapper with all of the children of the current wrapper.
     *
     * @param {String|Function} [selector]
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'children',
    value: function () {
      function children(selector) {
        var allChildren = this.flatMap(function (n) {
          return (0, _ShallowTraversal.childrenOfNode)(n.getNode());
        });
        return selector ? allChildren.filter(selector) : allChildren;
      }

      return children;
    }()

    /**
     * Returns a new wrapper with a specific child
     *
     * @param {Number} [index]
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'childAt',
    value: function () {
      function childAt(index) {
        var _this13 = this;

        return this.single('childAt', function () {
          return _this13.children().at(index);
        });
      }

      return childAt;
    }()

    /**
     * Returns a wrapper around all of the parents/ancestors of the wrapper. Does not include the node
     * in the current wrapper.
     *
     * NOTE: can only be called on a wrapper of a single node.
     *
     * @param {String|Function} [selector]
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'parents',
    value: function () {
      function parents(selector) {
        var _this14 = this;

        var allParents = this.wrap(this.single('parents', function (n) {
          return (0, _ShallowTraversal.parentsOfNode)(n, _this14.root.getNode());
        }));
        return selector ? allParents.filter(selector) : allParents;
      }

      return parents;
    }()

    /**
     * Returns a wrapper around the immediate parent of the current node.
     *
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'parent',
    value: function () {
      function parent() {
        return this.flatMap(function (n) {
          return [n.parents().get(0)];
        });
      }

      return parent;
    }()

    /**
     *
     * @param {String|Function} selector
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'closest',
    value: function () {
      function closest(selector) {
        return this.is(selector) ? this : this.parents().filter(selector).first();
      }

      return closest;
    }()

    /**
     * Shallow renders the current node and returns a shallow wrapper around it.
     *
     * NOTE: can only be called on wrapper of a single node.
     *
     * @param options object
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'shallow',
    value: function () {
      function shallow(options) {
        return this.single('shallow', function (n) {
          return new ShallowWrapper(n, null, options);
        });
      }

      return shallow;
    }()

    /**
     * Returns the value of prop with the given name of the current node.
     *
     * @param propName
     * @returns {*}
     */

  }, {
    key: 'prop',
    value: function () {
      function prop(propName) {
        return this.props()[propName];
      }

      return prop;
    }()

    /**
     * Returns the key assigned to the current node.
     *
     * @returns {String}
     */

  }, {
    key: 'key',
    value: function () {
      function key() {
        return this.single('key', function (n) {
          return n.key;
        });
      }

      return key;
    }()

    /**
     * Returns the type of the current node of this wrapper. If it's a composite component, this will
     * be the component constructor. If it's a native DOM node, it will be a string.
     *
     * @returns {String|Function}
     */

  }, {
    key: 'type',
    value: function () {
      function type() {
        return this.single('type', _Utils.typeOfNode);
      }

      return type;
    }()

    /**
     * Returns the name of the current node of this wrapper.
     *
     * In order of precedence => type.displayName -> type.name -> type.
     *
     * @returns {String}
     */

  }, {
    key: 'name',
    value: function () {
      function name() {
        return this.single('name', _Utils.displayNameOfNode);
      }

      return name;
    }()

    /**
     * Returns whether or not the current node has the given class name or not.
     *
     * NOTE: can only be called on a wrapper of a single node.
     *
     * @param className
     * @returns {Boolean}
     */

  }, {
    key: 'hasClass',
    value: function () {
      function hasClass(className) {
        if (className && className.indexOf('.') !== -1) {
          // eslint-disable-next-line no-console
          console.warn('It looks like you\'re calling `ShallowWrapper::hasClass()` with a CSS selector. ' + 'hasClass() expects a class name, not a CSS selector.');
        }
        return this.single('hasClass', function (n) {
          return (0, _ShallowTraversal.hasClassName)(n, className);
        });
      }

      return hasClass;
    }()

    /**
     * Iterates through each node of the current wrapper and executes the provided function with a
     * wrapper around the corresponding node passed in as the first argument.
     *
     * @param {Function} fn
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'forEach',
    value: function () {
      function forEach(fn) {
        var _this15 = this;

        this.getNodes().forEach(function (n, i) {
          return fn.call(_this15, _this15.wrap(n), i);
        });
        return this;
      }

      return forEach;
    }()

    /**
     * Maps the current array of nodes to another array. Each node is passed in as a `ShallowWrapper`
     * to the map function.
     *
     * @param {Function} fn
     * @returns {Array}
     */

  }, {
    key: 'map',
    value: function () {
      function map(fn) {
        var _this16 = this;

        return this.getNodes().map(function (n, i) {
          return fn.call(_this16, _this16.wrap(n), i);
        });
      }

      return map;
    }()

    /**
     * Reduces the current array of nodes to a value. Each node is passed in as a `ShallowWrapper`
     * to the reducer function.
     *
     * @param {Function} fn - the reducer function
     * @param {*} initialValue - the initial value
     * @returns {*}
     */

  }, {
    key: 'reduce',
    value: function () {
      function reduce(fn, initialValue) {
        var _this17 = this;

        return this.getNodes().reduce(function (accum, n, i) {
          return fn.call(_this17, accum, _this17.wrap(n), i);
        }, initialValue);
      }

      return reduce;
    }()

    /**
     * Reduces the current array of nodes to another array, from right to left. Each node is passed
     * in as a `ShallowWrapper` to the reducer function.
     *
     * @param {Function} fn - the reducer function
     * @param {*} initialValue - the initial value
     * @returns {*}
     */

  }, {
    key: 'reduceRight',
    value: function () {
      function reduceRight(fn, initialValue) {
        var _this18 = this;

        return this.getNodes().reduceRight(function (accum, n, i) {
          return fn.call(_this18, accum, _this18.wrap(n), i);
        }, initialValue);
      }

      return reduceRight;
    }()

    /**
     * Returns a new wrapper with a subset of the nodes of the original wrapper, according to the
     * rules of `Array#slice`.
     *
     * @param {Number} begin
     * @param {Number} end
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'slice',
    value: function () {
      function slice(begin, end) {
        return this.wrap(this.getNodes().slice(begin, end));
      }

      return slice;
    }()

    /**
     * Returns whether or not any of the nodes in the wrapper match the provided selector.
     *
     * @param {Function|String} selector
     * @returns {Boolean}
     */

  }, {
    key: 'some',
    value: function () {
      function some(selector) {
        if (this.root === this) {
          throw new Error('ShallowWrapper::some() can not be called on the root');
        }
        var predicate = (0, _ShallowTraversal.buildPredicate)(selector);
        return this.getNodes().some(predicate);
      }

      return some;
    }()

    /**
     * Returns whether or not any of the nodes in the wrapper pass the provided predicate function.
     *
     * @param {Function} predicate
     * @returns {Boolean}
     */

  }, {
    key: 'someWhere',
    value: function () {
      function someWhere(predicate) {
        var _this19 = this;

        return this.getNodes().some(function (n, i) {
          return predicate.call(_this19, _this19.wrap(n), i);
        });
      }

      return someWhere;
    }()

    /**
     * Returns whether or not all of the nodes in the wrapper match the provided selector.
     *
     * @param {Function|String} selector
     * @returns {Boolean}
     */

  }, {
    key: 'every',
    value: function () {
      function every(selector) {
        var predicate = (0, _ShallowTraversal.buildPredicate)(selector);
        return this.getNodes().every(predicate);
      }

      return every;
    }()

    /**
     * Returns whether or not any of the nodes in the wrapper pass the provided predicate function.
     *
     * @param {Function} predicate
     * @returns {Boolean}
     */

  }, {
    key: 'everyWhere',
    value: function () {
      function everyWhere(predicate) {
        var _this20 = this;

        return this.getNodes().every(function (n, i) {
          return predicate.call(_this20, _this20.wrap(n), i);
        });
      }

      return everyWhere;
    }()

    /**
     * Utility method used to create new wrappers with a mapping function that returns an array of
     * nodes in response to a single node wrapper. The returned wrapper is a single wrapper around
     * all of the mapped nodes flattened (and de-duplicated).
     *
     * @param {Function} fn
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'flatMap',
    value: function () {
      function flatMap(fn) {
        var _this21 = this;

        var nodes = this.getNodes().map(function (n, i) {
          return fn.call(_this21, _this21.wrap(n), i);
        });
        var flattened = (0, _flatten2['default'])(nodes, true);
        var uniques = (0, _uniq2['default'])(flattened);
        var compacted = (0, _compact2['default'])(uniques);
        return this.wrap(compacted);
      }

      return flatMap;
    }()

    /**
     * Finds all nodes in the current wrapper nodes' render trees that match the provided predicate
     * function. The predicate function will receive the nodes inside a ShallowWrapper as its
     * first argument.
     *
     * @param {Function} predicate
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'findWhere',
    value: function () {
      function findWhere(predicate) {
        var _this22 = this;

        return findWhereUnwrapped(this, function (n) {
          return predicate(_this22.wrap(n));
        });
      }

      return findWhere;
    }()

    /**
     * Returns the node at a given index of the current wrapper.
     *
     * @param index
     * @returns {ReactElement}
     */

  }, {
    key: 'get',
    value: function () {
      function get(index) {
        return this.getNodes()[index];
      }

      return get;
    }()

    /**
     * Returns a wrapper around the node at a given index of the current wrapper.
     *
     * @param index
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'at',
    value: function () {
      function at(index) {
        return this.wrap(this.getNodes()[index]);
      }

      return at;
    }()

    /**
     * Returns a wrapper around the first node of the current wrapper.
     *
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'first',
    value: function () {
      function first() {
        return this.at(0);
      }

      return first;
    }()

    /**
     * Returns a wrapper around the last node of the current wrapper.
     *
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'last',
    value: function () {
      function last() {
        return this.at(this.length - 1);
      }

      return last;
    }()

    /**
     * Delegates to exists()
     *
     * @returns {boolean}
     */

  }, {
    key: 'isEmpty',
    value: function () {
      function isEmpty() {
        // eslint-disable-next-line no-console
        console.warn('Enzyme::Deprecated method isEmpty() called, use exists() instead.');
        return !this.exists();
      }

      return isEmpty;
    }()

    /**
     * Returns true if the current wrapper has nodes. False otherwise.
     *
     * @returns {boolean}
     */

  }, {
    key: 'exists',
    value: function () {
      function exists() {
        return this.length > 0;
      }

      return exists;
    }()

    /**
     * Utility method that throws an error if the current instance has a length other than one.
     * This is primarily used to enforce that certain methods are only run on a wrapper when it is
     * wrapping a single node.
     *
     * @param fn
     * @returns {*}
     */

  }, {
    key: 'single',
    value: function () {
      function single(name, fn) {
        var fnName = typeof name === 'string' ? name : 'unknown';
        var callback = typeof fn === 'function' ? fn : name;
        if (this.length !== 1) {
          throw new Error('Method \u201C' + fnName + '\u201D is only meant to be run on a single node. ' + String(this.length) + ' found instead.');
        }
        return callback.call(this, this.getNode());
      }

      return single;
    }()

    /**
     * Helpful utility method to create a new wrapper with the same root as the current wrapper, with
     * any nodes passed in as the first parameter automatically wrapped.
     *
     * @param node
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'wrap',
    value: function () {
      function wrap(node) {
        if (node instanceof ShallowWrapper) {
          return node;
        }
        return new ShallowWrapper(node, this.root);
      }

      return wrap;
    }()

    /**
     * Returns an HTML-like string of the shallow render for debugging purposes.
     *
     * @returns {String}
     */

  }, {
    key: 'debug',
    value: function () {
      function debug() {
        return (0, _Debug.debugNodes)(this.getNodes());
      }

      return debug;
    }()

    /**
     * Invokes intercepter and returns itself. intercepter is called with itself.
     * This is helpful when debugging nodes in method chains.
     * @param fn
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'tap',
    value: function () {
      function tap(intercepter) {
        intercepter(this);
        return this;
      }

      return tap;
    }()

    /**
     * Primarily useful for HOCs (higher-order components), this method may only be
     * run on a single, non-DOM node, and will return the node, shallow-rendered.
     *
     * @param options object
     * @returns {ShallowWrapper}
     */

  }, {
    key: 'dive',
    value: function () {
      function dive() {
        var _this23 = this;

        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        var name = 'dive';
        return this.single(name, function (n) {
          if ((0, _reactCompat.isDOMComponentElement)(n)) {
            throw new TypeError('ShallowWrapper::' + name + '() can not be called on DOM components');
          }
          if (!(0, _Utils.isCustomComponentElement)(n)) {
            throw new TypeError('ShallowWrapper::' + name + '() can only be called on components');
          }
          return new ShallowWrapper(n, null, (0, _object2['default'])({}, _this23.options, options));
        });
      }

      return dive;
    }()
  }]);

  return ShallowWrapper;
}();

if (_Utils.ITERATOR_SYMBOL) {
  Object.defineProperty(ShallowWrapper.prototype, _Utils.ITERATOR_SYMBOL, {
    configurable: true,
    value: function () {
      function iterator() {
        return this.nodes[_Utils.ITERATOR_SYMBOL]();
      }

      return iterator;
    }()
  });
}

exports['default'] = ShallowWrapper;