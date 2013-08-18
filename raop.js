(function(context) {

  "use strict";

  var aSlice = [].slice,
    ownKey = Object.prototype.hasOwnProperty,
    toString = Object.prototype.toString,
    argumentError = new Error("argument is invalid"),
    adviceFunctionInvalidError =
      new Error("advice function is invalid. It should be function type");

  // polyfill
  Object.freeze = Object.freeze || function(obj) {
    return obj;
  };
  Object.keys = Object.keys || function(obj) {
    var ret = [];
    for(var k in obj) {
      if(!ownKey.call(obj, k)) {
        continue;
      }
      ret.push(k);
    }
    return ret;
  };
  Object.create = Object.create || function(obj) {
    var O = function(){};
    O.prototype = obj;
    return new O();
  };
  Array.prototype.forEach = Array.prototype.forEach || function ( callback, thisArg ) {
    var T, k;
    if ( this == null ) {
      throw new TypeError("this is null or not defined");
    }
    var O = Object(this);
    var len = O.length >>> 0;
    if (toString.call(callback) !== "[object Function]") {
      throw new TypeError(callback + " is not a function");
    }
    if(thisArg) {
      T = thisArg;
    }
    k = 0;
    while(k < len) {
      var kValue;
      if (ownKey.call(O, k) ) {
        kValue = O[k];
        callback.call( T, kValue, k, O );
      }
      k++;
    }
  };

  var root = context,
    raop = Object.create(null);

  var preventConflictName = root.raop;

  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = raop;
    }
    exports.raop = raop;
  }
  else {
    root.raop = raop;
  }

  var types = [ 'Function', 'Number', 'String', 'Date', 'RegExp' ],
    checker = function(type) {
      raop['is' + type] = function(obj) {
        return toString.call(obj) === '[object ' + type + ']';
      };
    };
  for(var t = 0,len = types.length; t < len; t++) {
    checker(types[t]);
  }
  raop.isArray = Array.isArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };
  raop.isObject = function(obj) {
    return obj === Object(obj);
  };

  var INGNORE_TYPES = [
    Function.prototype,
    Number.prototype,
    String.prototype,
    Date.prototype,
    Boolean.prototype,
    Object.prototype,
    Date.prototype,
    Array.prototype
  ];

  raop.noConflict = function() {
    root.raop = preventConflictName;
    return this;
  };

  // Object =========================================================

  raop.each = function(obj, iter) {
    if(obj.forEach) {
      obj.forEach(iter);
    }
    else if(raop.isObject(obj)) {
      var k;
      for(k in obj) {
        if(!ownKey.call(obj, k)) {
          continue;
        }
        iter.call(obj, obj[k], k);
      }
    }
    else {
      iter(obj);
    }
  };

  raop.extend = function(dst, src) {
    raop.each(src, function(v, k) {
      dst[k] = v;
    });
    return obj;
  };

  // Object end =========================================================

  // Utils ==============================================================

  var argumentsToArray = function(args){
    return aSlice.call(args);
  };
  raop.argumentsToArray = argumentsToArray;

  // Utils end ==========================================================

  // AOP =========================================================

  /**
   * options = {
   *    args: arguments, // function "Arguments" object
   *    target: target, // context(this) object
   *    todo: todo, // aop target function
   *    advice: advice, // advice function
   *    type: type, // advice type
   *    method: method name // join aop method name
   * }
   */
  var AdviceType = {
    "BEFORE": function(options) {
      var aValue = options.advice.call(options.target, options);
      var rValue = options.todo.apply(options.target, argumentsToArray(options.args));
      return aValue || rValue;
    },
    "AFTER": function(options) {
      var rValue = options.todo.apply(options.target, argumentsToArray(options.args));
      var aValue = options.advice.call(options.target, options);
      return aValue || rValue;
    },
    "AROUND": function(options) {
      return options.advice.call(
        options.target,
        function() {
          return options.todo.apply(
            options.target,
            argumentsToArray((arguments[0]) ? arguments : options.args)
          );
        },
        options
      );
    },
    "EXCEPTION": function(options) {
      try {
        return options.todo.apply(options.target, argumentsToArray(options.args));
      }
      catch(exception) {
        options.exception = exception;
        return options.advice.call(options.target, options);
      }
    }
  };

  var Pointcut = function(matcher) {
    this.matcher = matcher;
  };
  Pointcut.prototype.isMatch = function(value) {
    if(raop.isRegExp(this.matcher)) {
      return this.matcher.test(value);
    }
    else if(raop.isFunction(this.matcher)) {
      return this.matcher(value);
    }
    else {
      throw argumentError;
    }
  };

  var Advice = function(action) {
    action.$RAOP = {
      wrap: true
    };
    return action;
  };

  var cut = function(target, todo, type, advice, method) {
    var f = function() {
      return type({
        args: arguments,
        target: target,
        todo: todo,
        advice: advice,
        type: type,
        method: method
      });
    };
    f.name = method;
    return f;
  };

  var weave = function(obj, pointcut, type, advice) {

    INGNORE_TYPES.forEach(function(ignore) {
       if(ignore === obj) {
         throw new TypeError("cannot apply aop on Built-in Type");
       }
    });

    var keys = Object.keys(obj);
    if(raop.isString(type)) {
      type = AdviceType[type.toUpperCase()];
    }
    keys.forEach(function(val) {
      if(!raop.isString(val)) {
          return;
      }
      var p = obj[val];
      if(raop.isFunction(p) && pointcut.isMatch(val)) {
        obj[val] = cut(obj, p, type, advice, val);
      }
    });
    return obj;
  };

  raop.Aspect = {
    Pointcut: Pointcut,
    Advice: Advice,
    weave: weave,
    AdviceType: AdviceType
  };

  raop.before = function(obj, pointcut, advice) {
    return raop.weave(obj, pointcut, AdviceType.BEFORE, advice);
  };
  raop.after = function(obj, pointcut, advice) {
    return raop.weave(obj, pointcut, AdviceType.AFTER, advice);
  };
  raop.around = function(obj, pointcut, advice) {
    return raop.weave(obj, pointcut, AdviceType.AROUND, advice);
  };
  raop.exception = function(obj, pointcut, advice) {
    return raop.weave(obj, pointcut, AdviceType.EXCEPTION, advice);
  };

  // Argument Validation AOP
  weave(
    raop.Aspect,
    new Pointcut(/^weave$/),
    raop.Aspect.AdviceType.BEFORE,
    function(options) {
      if(!options.args || options.args.length < 3) {
        throw argumentError;
      }
      if(!raop.isObject(options.args[0])) {
        throw argumentError;
      }
      if(!raop.isFunction(options.advice)) {
        throw adviceFunctionInvalidError;
      }

      if(!options.advice.$RAOP) {
        options.advice = new Advice(options.advice);
      }
      // if second arguments is not Pointcut object, transform it.
      if(!(options.args[1] instanceof Pointcut)) {
        options.args[1] = new Pointcut(options.args[1]);
      }
    }
  );

  raop.weave = raop.Aspect.weave;

  // Freeze. Only ES 5+
  Object.freeze(raop);

  // AOP end =========================================================
})(this);