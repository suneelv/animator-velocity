

import velocity from 'velocity-animate';
import { animationEvent, TemplatingEngine } from 'aurelia-templating';
import { DOM, PLATFORM } from 'aurelia-pal';

import 'velocity-animate/velocity.ui';

export var VelocityAnimator = function () {
  function VelocityAnimator(container) {
    

    this.options = {
      duration: 400,
      easing: 'linear'
    };
    this.isAnimating = false;
    this.enterAnimation = { properties: ':enter', options: { easing: 'ease-in', duration: 200 } };
    this.leaveAnimation = { properties: ':leave', options: { easing: 'ease-in', duration: 200 } };
    this.easings = [];
    this.effects = {
      ':enter': 'fadeIn',
      ':leave': 'fadeOut'
    };

    this.container = container || DOM;
    this.easings = Object.assign(velocity.Easings, this.easings);
    this.effects = Object.assign(velocity.Redirects, this.effects);
  }

  VelocityAnimator.prototype.animate = function animate(element, nameOrProps, options, silent) {
    if (!element) return Promise.reject(new Error('first argument (element) must be defined'));
    if (!nameOrProps) return Promise.reject(new Error('second argument (animation name or properties) must be defined'));
    if (options && (!(options instanceof Object) || Array.isArray(options))) return Promise.reject(new Error('third argument (options) must be an Object'));

    this.isAnimating = true;

    var _this = this;
    var optionOverrides = {
      complete: function complete(el) {
        _this.isAnimating = false;
        if (!silent) dispatch(el, 'animateDone');
        if (options && options.complete) options.complete.apply(this, arguments);
      }
    };

    if (typeof element === 'string') element = this.container.querySelectorAll(element);

    if (!element || element.length === 0) return Promise.resolve(element);

    if (!silent) dispatch(element, 'animateBegin');

    if (typeof nameOrProps === 'string') {
      nameOrProps = this.resolveEffectAlias(nameOrProps);
      if (!this.effects[nameOrProps]) return Promise.reject(new Error('effect with name `' + nameOrProps + '` was not found'));
    }

    var velocityOptions = Object.assign({}, this.options, options, optionOverrides);
    var velocityPromise = velocity(element, nameOrProps, velocityOptions);
    return velocityPromise ? velocityPromise : Promise.reject(new Error('velocity animation failed due to invalid arguments'));
  };

  VelocityAnimator.prototype.stop = function stop(element, clearQueue) {
    velocity(element, 'stop', clearQueue);
    this.isAnimating = false;
    return this;
  };

  VelocityAnimator.prototype.reverse = function reverse(element) {
    velocity(element, 'reverse');
    return this;
  };

  VelocityAnimator.prototype.rewind = function rewind(element) {
    velocity(name, 'rewind');
    return this;
  };

  VelocityAnimator.prototype.registerEffect = function registerEffect(name, props) {
    if (name[0] === ':') {
      if (typeof props === 'string') {
        this.effects[name] = props;
      } else {
        throw new Error('second parameter must be a string when registering aliases');
      }
    } else {
      velocity.RegisterEffect(name, props);
    }
    return this;
  };

  VelocityAnimator.prototype.unregisterEffect = function unregisterEffect(name) {
    delete this.effects[name];
    return this;
  };

  VelocityAnimator.prototype.runSequence = function runSequence(sequence) {
    var _this2 = this;

    dispatch(PLATFORM.global, 'sequenceBegin');
    return new Promise(function (resolve, reject) {
      _this2.sequenceReject = resolve;
      var last = sequence[sequence.length - 1];
      last.options = last.options || last.o || {};
      last.options.complete = function () {
        if (!_this2.sequenceReject) return;
        _this2.sequenceReject = undefined;
        dispatch(PLATFORM.global, 'sequenceDone');
        resolve();
      };
      try {
        velocity.RunSequence(sequence);
      } catch (e) {
        _this2.stopSequence(sequence);
        _this2.sequenceReject(e);
      }
    });
  };

  VelocityAnimator.prototype.stopSequence = function stopSequence(sequence) {
    var _this3 = this;

    sequence.map(function (item) {
      var el = item.e || item.element || item.elements;
      _this3.stop(el, true);
    });
    if (this.sequenceReject) {
      this.sequenceReject();
      this.sequenceReject = undefined;
    }
    dispatch(PLATFORM.global, 'sequenceDone');
    return this;
  };

  VelocityAnimator.prototype.resolveEffectAlias = function resolveEffectAlias(alias) {
    if (typeof alias === 'string' && alias[0] === ':') {
      return this.effects[alias];
    }
    return alias;
  };

  VelocityAnimator.prototype.enter = function enter(element, effectName, options) {
    return this.stop(element, true)._runElementAnimation(element, effectName || ':enter', options, 'enter');
  };

  VelocityAnimator.prototype.leave = function leave(element, effectName, options) {
    return this.stop(element, true)._runElementAnimation(element, effectName || ':leave', options, 'leave');
  };

  VelocityAnimator.prototype.removeClass = function removeClass(element, className) {
    element.classList.remove(className);
    return Promise.resolve(false);
  };

  VelocityAnimator.prototype.addClass = function addClass(element, className) {
    element.classList.add(className);
    return Promise.resolve(false);
  };

  VelocityAnimator.prototype._runElements = function _runElements(element, name) {
    var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    if (!element) return Promise.reject(new Error('invalid first argument'));

    if (typeof element === 'string') element = this.container.querySelectorAll(element);

    if (!element || element.length === 0) return Promise.resolve(element);

    for (var i = 0; i < element.length; i++) {
      this._runElementAnimation(element[i], name, options);
    }

    return Promise.resolve(element);
  };

  VelocityAnimator.prototype._runElementAnimation = function _runElementAnimation(element, name) {
    var _this4 = this,
        _arguments = arguments;

    var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
    var eventName = arguments.length <= 3 || arguments[3] === undefined ? undefined : arguments[3];

    if (!element) return Promise.reject(new Error('invalid first argument'));

    if (typeof element === 'string') element = this.container.querySelectorAll(element);

    if (!element || element.length === 0) return Promise.resolve(element);

    if (!element.animations) this._parseAttributes(element);

    if (eventName) dispatch(element, eventName + 'Begin');

    var overrides = {
      complete: function complete(elements) {
        _this4.isAnimating = false;
        if (eventName) dispatch(element, eventName + 'Done');
        if (options && options.complete) options.complete.apply(_this4, _arguments);
      }
    };

    var attrOpts = {};
    switch (name) {
      case ':enter':
        var enter = element.animations.enter;
        name = enter.properties;
        attrOpts = enter.options;
        break;

      case ':leave':
        var leave = element.animations.leave;
        name = leave.properties;
        attrOpts = leave.options;
        break;

      default:
        if (!this.effects[this.resolveEffectAlias(name)]) throw new Error(name + ' animation is not supported.');
    }

    var opts = Object.assign({}, this.options, attrOpts, options, overrides);
    return this.animate(element, name, opts, true);
  };

  VelocityAnimator.prototype._parseAttributes = function _parseAttributes(element) {
    var el = void 0;
    var i = void 0;
    var l = void 0;
    element = this._ensureList(element);
    for (i = 0, l = element.length; i < l; i++) {
      el = element[i];
      el.animations = {};
      el.animations.enter = this._parseAttributeValue(el.getAttribute('anim-enter')) || this.enterAnimation;
      el.animations.leave = this._parseAttributeValue(el.getAttribute('anim-leave')) || this.leaveAnimation;
    }
  };

  VelocityAnimator.prototype._parseAttributeValue = function _parseAttributeValue(value) {
    if (!value) {
      return value;
    }

    var p = value.split(';');
    var properties = p[0].trim();
    var options = {};

    if (properties[0] === '{' && properties[properties.length - 1] === '}') {
      properties = parseJSObject(properties);
    }

    if (p.length > 1) {
      options = parseJSObject(p[1].trim());
    }

    return { properties: properties, options: options };
  };

  VelocityAnimator.prototype._ensureList = function _ensureList(element) {
    if (!Array.isArray(element) && !(element instanceof NodeList)) element = [element];
    return element;
  };

  return VelocityAnimator;
}();

function dispatch(element, name) {
  var evt = DOM.createCustomEvent(animationEvent[name], { bubbles: true, cancelable: true, detail: element });
  DOM.dispatchEvent(evt);
}

function parseJSObject(text) {
  if (typeof text !== 'string' || !text) {
    return null;
  }

  text = text.replace('{', '').replace('}', '');
  var pairs = text.split(/[,]+(?![^\[]+\])/);
  var obj = {};

  for (var i = 0; i < pairs.length; ++i) {
    var keyAndValue = pairs[i].split(':');
    var value = keyAndValue[1].trim();

    if (value[0] === '[' && value[value.length - 1] === ']' && value.indexOf(',') > -1) value = value.replace('[', '').replace(']', '').split(',');

    obj[keyAndValue[0].trim()] = value;
  }

  return obj;
}

export function configure(config, callback) {
  var animator = config.container.get(VelocityAnimator);
  config.container.get(TemplatingEngine).configureAnimator(animator);
  if (typeof callback === 'function') {
    callback(animator);
  }
}