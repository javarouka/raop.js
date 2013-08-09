/**
 * User: javarouka
 * Date: 13. 6. 28
 * Time: 오후 4:13
 */
var raop = require("./../raop.js");

exports.testCheckExistProperties = function(test) {
  test.ok(typeof raop.Aspect === 'object', "Aspect object exists");
  test.ok(typeof raop.Aspect.weave === 'function', "Aspect weave method exists");
  test.ok(typeof raop.Aspect.AdviceType === 'object', "Aspect AdviceType object exists");
  test.done();
};

exports.testApplyAOPBasic = function(test) {

  var obj = {
    a: function(one) {
      return one;
    },
    b: function(two) {
      return two;
    },
    c: function(three) {
      return three;
    }
  };

  raop.Aspect.weave(
    obj,
    /^(a+|c+)/,
    raop.Aspect.AdviceType.BEFORE,
    function(options) {
      options.args[0] = 1000;
    }
  );

  test.ok(obj.a(1) === 1000, "method a aop apply");
  test.ok(obj.b(2) === 2, "method b aop no-apply");
  test.ok(obj.c(3) === 1000, "method a aop apply");

  test.done();
};

