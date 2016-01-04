var miscUtils = {};

/**
 * Return a new array with element removed from given array
 */
miscUtils.removeFrom = function (array, element) {
  if (!array) { return [] };
  var res = [];
  array.forEach(function (e) { if (e !== element) { res.push(e); } });
  return res;
};

// Interface
module.exports = miscUtils;
