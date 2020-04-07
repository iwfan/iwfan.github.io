(function () {
	'use strict';

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	var runtime_1 = createCommonjsModule(function (module) {
	/**
	 * Copyright (c) 2014-present, Facebook, Inc.
	 *
	 * This source code is licensed under the MIT license found in the
	 * LICENSE file in the root directory of this source tree.
	 */

	var runtime = (function (exports) {

	  var Op = Object.prototype;
	  var hasOwn = Op.hasOwnProperty;
	  var undefined$1; // More compressible than void 0.
	  var $Symbol = typeof Symbol === "function" ? Symbol : {};
	  var iteratorSymbol = $Symbol.iterator || "@@iterator";
	  var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
	  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

	  function wrap(innerFn, outerFn, self, tryLocsList) {
	    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
	    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
	    var generator = Object.create(protoGenerator.prototype);
	    var context = new Context(tryLocsList || []);

	    // The ._invoke method unifies the implementations of the .next,
	    // .throw, and .return methods.
	    generator._invoke = makeInvokeMethod(innerFn, self, context);

	    return generator;
	  }
	  exports.wrap = wrap;

	  // Try/catch helper to minimize deoptimizations. Returns a completion
	  // record like context.tryEntries[i].completion. This interface could
	  // have been (and was previously) designed to take a closure to be
	  // invoked without arguments, but in all the cases we care about we
	  // already have an existing method we want to call, so there's no need
	  // to create a new function object. We can even get away with assuming
	  // the method takes exactly one argument, since that happens to be true
	  // in every case, so we don't have to touch the arguments object. The
	  // only additional allocation required is the completion record, which
	  // has a stable shape and so hopefully should be cheap to allocate.
	  function tryCatch(fn, obj, arg) {
	    try {
	      return { type: "normal", arg: fn.call(obj, arg) };
	    } catch (err) {
	      return { type: "throw", arg: err };
	    }
	  }

	  var GenStateSuspendedStart = "suspendedStart";
	  var GenStateSuspendedYield = "suspendedYield";
	  var GenStateExecuting = "executing";
	  var GenStateCompleted = "completed";

	  // Returning this object from the innerFn has the same effect as
	  // breaking out of the dispatch switch statement.
	  var ContinueSentinel = {};

	  // Dummy constructor functions that we use as the .constructor and
	  // .constructor.prototype properties for functions that return Generator
	  // objects. For full spec compliance, you may wish to configure your
	  // minifier not to mangle the names of these two functions.
	  function Generator() {}
	  function GeneratorFunction() {}
	  function GeneratorFunctionPrototype() {}

	  // This is a polyfill for %IteratorPrototype% for environments that
	  // don't natively support it.
	  var IteratorPrototype = {};
	  IteratorPrototype[iteratorSymbol] = function () {
	    return this;
	  };

	  var getProto = Object.getPrototypeOf;
	  var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
	  if (NativeIteratorPrototype &&
	      NativeIteratorPrototype !== Op &&
	      hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
	    // This environment has a native %IteratorPrototype%; use it instead
	    // of the polyfill.
	    IteratorPrototype = NativeIteratorPrototype;
	  }

	  var Gp = GeneratorFunctionPrototype.prototype =
	    Generator.prototype = Object.create(IteratorPrototype);
	  GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
	  GeneratorFunctionPrototype.constructor = GeneratorFunction;
	  GeneratorFunctionPrototype[toStringTagSymbol] =
	    GeneratorFunction.displayName = "GeneratorFunction";

	  // Helper for defining the .next, .throw, and .return methods of the
	  // Iterator interface in terms of a single ._invoke method.
	  function defineIteratorMethods(prototype) {
	    ["next", "throw", "return"].forEach(function(method) {
	      prototype[method] = function(arg) {
	        return this._invoke(method, arg);
	      };
	    });
	  }

	  exports.isGeneratorFunction = function(genFun) {
	    var ctor = typeof genFun === "function" && genFun.constructor;
	    return ctor
	      ? ctor === GeneratorFunction ||
	        // For the native GeneratorFunction constructor, the best we can
	        // do is to check its .name property.
	        (ctor.displayName || ctor.name) === "GeneratorFunction"
	      : false;
	  };

	  exports.mark = function(genFun) {
	    if (Object.setPrototypeOf) {
	      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
	    } else {
	      genFun.__proto__ = GeneratorFunctionPrototype;
	      if (!(toStringTagSymbol in genFun)) {
	        genFun[toStringTagSymbol] = "GeneratorFunction";
	      }
	    }
	    genFun.prototype = Object.create(Gp);
	    return genFun;
	  };

	  // Within the body of any async function, `await x` is transformed to
	  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
	  // `hasOwn.call(value, "__await")` to determine if the yielded value is
	  // meant to be awaited.
	  exports.awrap = function(arg) {
	    return { __await: arg };
	  };

	  function AsyncIterator(generator, PromiseImpl) {
	    function invoke(method, arg, resolve, reject) {
	      var record = tryCatch(generator[method], generator, arg);
	      if (record.type === "throw") {
	        reject(record.arg);
	      } else {
	        var result = record.arg;
	        var value = result.value;
	        if (value &&
	            typeof value === "object" &&
	            hasOwn.call(value, "__await")) {
	          return PromiseImpl.resolve(value.__await).then(function(value) {
	            invoke("next", value, resolve, reject);
	          }, function(err) {
	            invoke("throw", err, resolve, reject);
	          });
	        }

	        return PromiseImpl.resolve(value).then(function(unwrapped) {
	          // When a yielded Promise is resolved, its final value becomes
	          // the .value of the Promise<{value,done}> result for the
	          // current iteration.
	          result.value = unwrapped;
	          resolve(result);
	        }, function(error) {
	          // If a rejected Promise was yielded, throw the rejection back
	          // into the async generator function so it can be handled there.
	          return invoke("throw", error, resolve, reject);
	        });
	      }
	    }

	    var previousPromise;

	    function enqueue(method, arg) {
	      function callInvokeWithMethodAndArg() {
	        return new PromiseImpl(function(resolve, reject) {
	          invoke(method, arg, resolve, reject);
	        });
	      }

	      return previousPromise =
	        // If enqueue has been called before, then we want to wait until
	        // all previous Promises have been resolved before calling invoke,
	        // so that results are always delivered in the correct order. If
	        // enqueue has not been called before, then it is important to
	        // call invoke immediately, without waiting on a callback to fire,
	        // so that the async generator function has the opportunity to do
	        // any necessary setup in a predictable way. This predictability
	        // is why the Promise constructor synchronously invokes its
	        // executor callback, and why async functions synchronously
	        // execute code before the first await. Since we implement simple
	        // async functions in terms of async generators, it is especially
	        // important to get this right, even though it requires care.
	        previousPromise ? previousPromise.then(
	          callInvokeWithMethodAndArg,
	          // Avoid propagating failures to Promises returned by later
	          // invocations of the iterator.
	          callInvokeWithMethodAndArg
	        ) : callInvokeWithMethodAndArg();
	    }

	    // Define the unified helper method that is used to implement .next,
	    // .throw, and .return (see defineIteratorMethods).
	    this._invoke = enqueue;
	  }

	  defineIteratorMethods(AsyncIterator.prototype);
	  AsyncIterator.prototype[asyncIteratorSymbol] = function () {
	    return this;
	  };
	  exports.AsyncIterator = AsyncIterator;

	  // Note that simple async functions are implemented on top of
	  // AsyncIterator objects; they just return a Promise for the value of
	  // the final result produced by the iterator.
	  exports.async = function(innerFn, outerFn, self, tryLocsList, PromiseImpl) {
	    if (PromiseImpl === void 0) PromiseImpl = Promise;

	    var iter = new AsyncIterator(
	      wrap(innerFn, outerFn, self, tryLocsList),
	      PromiseImpl
	    );

	    return exports.isGeneratorFunction(outerFn)
	      ? iter // If outerFn is a generator, return the full iterator.
	      : iter.next().then(function(result) {
	          return result.done ? result.value : iter.next();
	        });
	  };

	  function makeInvokeMethod(innerFn, self, context) {
	    var state = GenStateSuspendedStart;

	    return function invoke(method, arg) {
	      if (state === GenStateExecuting) {
	        throw new Error("Generator is already running");
	      }

	      if (state === GenStateCompleted) {
	        if (method === "throw") {
	          throw arg;
	        }

	        // Be forgiving, per 25.3.3.3.3 of the spec:
	        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
	        return doneResult();
	      }

	      context.method = method;
	      context.arg = arg;

	      while (true) {
	        var delegate = context.delegate;
	        if (delegate) {
	          var delegateResult = maybeInvokeDelegate(delegate, context);
	          if (delegateResult) {
	            if (delegateResult === ContinueSentinel) continue;
	            return delegateResult;
	          }
	        }

	        if (context.method === "next") {
	          // Setting context._sent for legacy support of Babel's
	          // function.sent implementation.
	          context.sent = context._sent = context.arg;

	        } else if (context.method === "throw") {
	          if (state === GenStateSuspendedStart) {
	            state = GenStateCompleted;
	            throw context.arg;
	          }

	          context.dispatchException(context.arg);

	        } else if (context.method === "return") {
	          context.abrupt("return", context.arg);
	        }

	        state = GenStateExecuting;

	        var record = tryCatch(innerFn, self, context);
	        if (record.type === "normal") {
	          // If an exception is thrown from innerFn, we leave state ===
	          // GenStateExecuting and loop back for another invocation.
	          state = context.done
	            ? GenStateCompleted
	            : GenStateSuspendedYield;

	          if (record.arg === ContinueSentinel) {
	            continue;
	          }

	          return {
	            value: record.arg,
	            done: context.done
	          };

	        } else if (record.type === "throw") {
	          state = GenStateCompleted;
	          // Dispatch the exception by looping back around to the
	          // context.dispatchException(context.arg) call above.
	          context.method = "throw";
	          context.arg = record.arg;
	        }
	      }
	    };
	  }

	  // Call delegate.iterator[context.method](context.arg) and handle the
	  // result, either by returning a { value, done } result from the
	  // delegate iterator, or by modifying context.method and context.arg,
	  // setting context.delegate to null, and returning the ContinueSentinel.
	  function maybeInvokeDelegate(delegate, context) {
	    var method = delegate.iterator[context.method];
	    if (method === undefined$1) {
	      // A .throw or .return when the delegate iterator has no .throw
	      // method always terminates the yield* loop.
	      context.delegate = null;

	      if (context.method === "throw") {
	        // Note: ["return"] must be used for ES3 parsing compatibility.
	        if (delegate.iterator["return"]) {
	          // If the delegate iterator has a return method, give it a
	          // chance to clean up.
	          context.method = "return";
	          context.arg = undefined$1;
	          maybeInvokeDelegate(delegate, context);

	          if (context.method === "throw") {
	            // If maybeInvokeDelegate(context) changed context.method from
	            // "return" to "throw", let that override the TypeError below.
	            return ContinueSentinel;
	          }
	        }

	        context.method = "throw";
	        context.arg = new TypeError(
	          "The iterator does not provide a 'throw' method");
	      }

	      return ContinueSentinel;
	    }

	    var record = tryCatch(method, delegate.iterator, context.arg);

	    if (record.type === "throw") {
	      context.method = "throw";
	      context.arg = record.arg;
	      context.delegate = null;
	      return ContinueSentinel;
	    }

	    var info = record.arg;

	    if (! info) {
	      context.method = "throw";
	      context.arg = new TypeError("iterator result is not an object");
	      context.delegate = null;
	      return ContinueSentinel;
	    }

	    if (info.done) {
	      // Assign the result of the finished delegate to the temporary
	      // variable specified by delegate.resultName (see delegateYield).
	      context[delegate.resultName] = info.value;

	      // Resume execution at the desired location (see delegateYield).
	      context.next = delegate.nextLoc;

	      // If context.method was "throw" but the delegate handled the
	      // exception, let the outer generator proceed normally. If
	      // context.method was "next", forget context.arg since it has been
	      // "consumed" by the delegate iterator. If context.method was
	      // "return", allow the original .return call to continue in the
	      // outer generator.
	      if (context.method !== "return") {
	        context.method = "next";
	        context.arg = undefined$1;
	      }

	    } else {
	      // Re-yield the result returned by the delegate method.
	      return info;
	    }

	    // The delegate iterator is finished, so forget it and continue with
	    // the outer generator.
	    context.delegate = null;
	    return ContinueSentinel;
	  }

	  // Define Generator.prototype.{next,throw,return} in terms of the
	  // unified ._invoke helper method.
	  defineIteratorMethods(Gp);

	  Gp[toStringTagSymbol] = "Generator";

	  // A Generator should always return itself as the iterator object when the
	  // @@iterator function is called on it. Some browsers' implementations of the
	  // iterator prototype chain incorrectly implement this, causing the Generator
	  // object to not be returned from this call. This ensures that doesn't happen.
	  // See https://github.com/facebook/regenerator/issues/274 for more details.
	  Gp[iteratorSymbol] = function() {
	    return this;
	  };

	  Gp.toString = function() {
	    return "[object Generator]";
	  };

	  function pushTryEntry(locs) {
	    var entry = { tryLoc: locs[0] };

	    if (1 in locs) {
	      entry.catchLoc = locs[1];
	    }

	    if (2 in locs) {
	      entry.finallyLoc = locs[2];
	      entry.afterLoc = locs[3];
	    }

	    this.tryEntries.push(entry);
	  }

	  function resetTryEntry(entry) {
	    var record = entry.completion || {};
	    record.type = "normal";
	    delete record.arg;
	    entry.completion = record;
	  }

	  function Context(tryLocsList) {
	    // The root entry object (effectively a try statement without a catch
	    // or a finally block) gives us a place to store values thrown from
	    // locations where there is no enclosing try statement.
	    this.tryEntries = [{ tryLoc: "root" }];
	    tryLocsList.forEach(pushTryEntry, this);
	    this.reset(true);
	  }

	  exports.keys = function(object) {
	    var keys = [];
	    for (var key in object) {
	      keys.push(key);
	    }
	    keys.reverse();

	    // Rather than returning an object with a next method, we keep
	    // things simple and return the next function itself.
	    return function next() {
	      while (keys.length) {
	        var key = keys.pop();
	        if (key in object) {
	          next.value = key;
	          next.done = false;
	          return next;
	        }
	      }

	      // To avoid creating an additional object, we just hang the .value
	      // and .done properties off the next function object itself. This
	      // also ensures that the minifier will not anonymize the function.
	      next.done = true;
	      return next;
	    };
	  };

	  function values(iterable) {
	    if (iterable) {
	      var iteratorMethod = iterable[iteratorSymbol];
	      if (iteratorMethod) {
	        return iteratorMethod.call(iterable);
	      }

	      if (typeof iterable.next === "function") {
	        return iterable;
	      }

	      if (!isNaN(iterable.length)) {
	        var i = -1, next = function next() {
	          while (++i < iterable.length) {
	            if (hasOwn.call(iterable, i)) {
	              next.value = iterable[i];
	              next.done = false;
	              return next;
	            }
	          }

	          next.value = undefined$1;
	          next.done = true;

	          return next;
	        };

	        return next.next = next;
	      }
	    }

	    // Return an iterator with no values.
	    return { next: doneResult };
	  }
	  exports.values = values;

	  function doneResult() {
	    return { value: undefined$1, done: true };
	  }

	  Context.prototype = {
	    constructor: Context,

	    reset: function(skipTempReset) {
	      this.prev = 0;
	      this.next = 0;
	      // Resetting context._sent for legacy support of Babel's
	      // function.sent implementation.
	      this.sent = this._sent = undefined$1;
	      this.done = false;
	      this.delegate = null;

	      this.method = "next";
	      this.arg = undefined$1;

	      this.tryEntries.forEach(resetTryEntry);

	      if (!skipTempReset) {
	        for (var name in this) {
	          // Not sure about the optimal order of these conditions:
	          if (name.charAt(0) === "t" &&
	              hasOwn.call(this, name) &&
	              !isNaN(+name.slice(1))) {
	            this[name] = undefined$1;
	          }
	        }
	      }
	    },

	    stop: function() {
	      this.done = true;

	      var rootEntry = this.tryEntries[0];
	      var rootRecord = rootEntry.completion;
	      if (rootRecord.type === "throw") {
	        throw rootRecord.arg;
	      }

	      return this.rval;
	    },

	    dispatchException: function(exception) {
	      if (this.done) {
	        throw exception;
	      }

	      var context = this;
	      function handle(loc, caught) {
	        record.type = "throw";
	        record.arg = exception;
	        context.next = loc;

	        if (caught) {
	          // If the dispatched exception was caught by a catch block,
	          // then let that catch block handle the exception normally.
	          context.method = "next";
	          context.arg = undefined$1;
	        }

	        return !! caught;
	      }

	      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	        var entry = this.tryEntries[i];
	        var record = entry.completion;

	        if (entry.tryLoc === "root") {
	          // Exception thrown outside of any try block that could handle
	          // it, so set the completion value of the entire function to
	          // throw the exception.
	          return handle("end");
	        }

	        if (entry.tryLoc <= this.prev) {
	          var hasCatch = hasOwn.call(entry, "catchLoc");
	          var hasFinally = hasOwn.call(entry, "finallyLoc");

	          if (hasCatch && hasFinally) {
	            if (this.prev < entry.catchLoc) {
	              return handle(entry.catchLoc, true);
	            } else if (this.prev < entry.finallyLoc) {
	              return handle(entry.finallyLoc);
	            }

	          } else if (hasCatch) {
	            if (this.prev < entry.catchLoc) {
	              return handle(entry.catchLoc, true);
	            }

	          } else if (hasFinally) {
	            if (this.prev < entry.finallyLoc) {
	              return handle(entry.finallyLoc);
	            }

	          } else {
	            throw new Error("try statement without catch or finally");
	          }
	        }
	      }
	    },

	    abrupt: function(type, arg) {
	      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	        var entry = this.tryEntries[i];
	        if (entry.tryLoc <= this.prev &&
	            hasOwn.call(entry, "finallyLoc") &&
	            this.prev < entry.finallyLoc) {
	          var finallyEntry = entry;
	          break;
	        }
	      }

	      if (finallyEntry &&
	          (type === "break" ||
	           type === "continue") &&
	          finallyEntry.tryLoc <= arg &&
	          arg <= finallyEntry.finallyLoc) {
	        // Ignore the finally entry if control is not jumping to a
	        // location outside the try/catch block.
	        finallyEntry = null;
	      }

	      var record = finallyEntry ? finallyEntry.completion : {};
	      record.type = type;
	      record.arg = arg;

	      if (finallyEntry) {
	        this.method = "next";
	        this.next = finallyEntry.finallyLoc;
	        return ContinueSentinel;
	      }

	      return this.complete(record);
	    },

	    complete: function(record, afterLoc) {
	      if (record.type === "throw") {
	        throw record.arg;
	      }

	      if (record.type === "break" ||
	          record.type === "continue") {
	        this.next = record.arg;
	      } else if (record.type === "return") {
	        this.rval = this.arg = record.arg;
	        this.method = "return";
	        this.next = "end";
	      } else if (record.type === "normal" && afterLoc) {
	        this.next = afterLoc;
	      }

	      return ContinueSentinel;
	    },

	    finish: function(finallyLoc) {
	      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	        var entry = this.tryEntries[i];
	        if (entry.finallyLoc === finallyLoc) {
	          this.complete(entry.completion, entry.afterLoc);
	          resetTryEntry(entry);
	          return ContinueSentinel;
	        }
	      }
	    },

	    "catch": function(tryLoc) {
	      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	        var entry = this.tryEntries[i];
	        if (entry.tryLoc === tryLoc) {
	          var record = entry.completion;
	          if (record.type === "throw") {
	            var thrown = record.arg;
	            resetTryEntry(entry);
	          }
	          return thrown;
	        }
	      }

	      // The context.catch method must only be called with a location
	      // argument that corresponds to a known catch block.
	      throw new Error("illegal catch attempt");
	    },

	    delegateYield: function(iterable, resultName, nextLoc) {
	      this.delegate = {
	        iterator: values(iterable),
	        resultName: resultName,
	        nextLoc: nextLoc
	      };

	      if (this.method === "next") {
	        // Deliberately forget the last sent value so that we don't
	        // accidentally pass it on to the delegate.
	        this.arg = undefined$1;
	      }

	      return ContinueSentinel;
	    }
	  };

	  // Regardless of whether this script is executing as a CommonJS module
	  // or not, return the runtime object so that we can declare the variable
	  // regeneratorRuntime in the outer scope, which allows this module to be
	  // injected easily by `bin/regenerator --include-runtime script.js`.
	  return exports;

	}(
	  // If this script is executing as a CommonJS module, use module.exports
	  // as the regeneratorRuntime namespace. Otherwise create a new empty
	  // object. Either way, the resulting object will be used to initialize
	  // the regeneratorRuntime variable at the top of this file.
	   module.exports 
	));

	try {
	  regeneratorRuntime = runtime;
	} catch (accidentalStrictMode) {
	  // This module should not be running in strict mode, so the above
	  // assignment should always work unless something is misconfigured. Just
	  // in case runtime.js accidentally runs in strict mode, we can escape
	  // strict mode using a global Function call. This could conceivably fail
	  // if a Content Security Policy forbids using Function, but in that case
	  // the proper solution is to fix the accidental strict mode problem. If
	  // you've misconfigured your bundler to force strict mode and applied a
	  // CSP to forbid Function, and you're not willing to fix either of those
	  // problems, please detail your unique predicament in a GitHub issue.
	  Function("r", "regeneratorRuntime = r")(runtime);
	}
	});

	var regenerator = runtime_1;

	function _arrayWithHoles(arr) {
	  if (Array.isArray(arr)) return arr;
	}

	var arrayWithHoles = _arrayWithHoles;

	function _iterableToArrayLimit(arr, i) {
	  if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return;
	  var _arr = [];
	  var _n = true;
	  var _d = false;
	  var _e = undefined;

	  try {
	    for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
	      _arr.push(_s.value);

	      if (i && _arr.length === i) break;
	    }
	  } catch (err) {
	    _d = true;
	    _e = err;
	  } finally {
	    try {
	      if (!_n && _i["return"] != null) _i["return"]();
	    } finally {
	      if (_d) throw _e;
	    }
	  }

	  return _arr;
	}

	var iterableToArrayLimit = _iterableToArrayLimit;

	function _arrayLikeToArray(arr, len) {
	  if (len == null || len > arr.length) len = arr.length;

	  for (var i = 0, arr2 = new Array(len); i < len; i++) {
	    arr2[i] = arr[i];
	  }

	  return arr2;
	}

	var arrayLikeToArray = _arrayLikeToArray;

	function _unsupportedIterableToArray(o, minLen) {
	  if (!o) return;
	  if (typeof o === "string") return arrayLikeToArray(o, minLen);
	  var n = Object.prototype.toString.call(o).slice(8, -1);
	  if (n === "Object" && o.constructor) n = o.constructor.name;
	  if (n === "Map" || n === "Set") return Array.from(n);
	  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return arrayLikeToArray(o, minLen);
	}

	var unsupportedIterableToArray = _unsupportedIterableToArray;

	function _nonIterableRest() {
	  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
	}

	var nonIterableRest = _nonIterableRest;

	function _slicedToArray(arr, i) {
	  return arrayWithHoles(arr) || iterableToArrayLimit(arr, i) || unsupportedIterableToArray(arr, i) || nonIterableRest();
	}

	var slicedToArray = _slicedToArray;

	function _classCallCheck(instance, Constructor) {
	  if (!(instance instanceof Constructor)) {
	    throw new TypeError("Cannot call a class as a function");
	  }
	}

	var classCallCheck = _classCallCheck;

	function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
	  try {
	    var info = gen[key](arg);
	    var value = info.value;
	  } catch (error) {
	    reject(error);
	    return;
	  }

	  if (info.done) {
	    resolve(value);
	  } else {
	    Promise.resolve(value).then(_next, _throw);
	  }
	}

	function _asyncToGenerator(fn) {
	  return function () {
	    var self = this,
	        args = arguments;
	    return new Promise(function (resolve, reject) {
	      var gen = fn.apply(self, args);

	      function _next(value) {
	        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
	      }

	      function _throw(err) {
	        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
	      }

	      _next(undefined);
	    });
	  };
	}

	var asyncToGenerator = _asyncToGenerator;

	function _createForOfIteratorHelper(o) { if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (o = _unsupportedIterableToArray$1(o))) { var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var it, normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

	function _unsupportedIterableToArray$1(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$1(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(n); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$1(o, minLen); }

	function _arrayLikeToArray$1(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

	/* ES Module Shims 0.4.5 */
	(function () {

	  var resolvedPromise = Promise.resolve();
	  var baseUrl;

	  function createBlob(source) {
	    return URL.createObjectURL(new Blob([source], {
	      type: 'application/javascript'
	    }));
	  }

	  var hasDocument = typeof document !== 'undefined'; // support browsers without dynamic import support (eg Firefox 6x)

	  var dynamicImport;

	  try {
	    dynamicImport = (0, eval)('u=>import(u)');
	  } catch (e) {
	    if (hasDocument) {
	      self.addEventListener('error', function (e) {
	        return importShim.e = e.error;
	      });

	      dynamicImport = function dynamicImport(blobUrl) {
	        var topLevelBlobUrl = createBlob("import*as m from'".concat(blobUrl, "';self.importShim.l=m;self.importShim.e=null"));
	        var s = document.createElement('script');
	        s.type = 'module';
	        s.src = topLevelBlobUrl;
	        document.head.appendChild(s);
	        return new Promise(function (resolve, reject) {
	          s.addEventListener('load', function () {
	            document.head.removeChild(s);
	            importShim.e ? reject(importShim.e) : resolve(importShim.l, baseUrl);
	          });
	        });
	      };
	    }
	  }

	  if (hasDocument) {
	    var baseEl = document.querySelector('base[href]');
	    if (baseEl) baseUrl = baseEl.href;
	  }

	  if (!baseUrl && typeof location !== 'undefined') {
	    baseUrl = location.href.split('#')[0].split('?')[0];
	    var lastSepIndex = baseUrl.lastIndexOf('/');
	    if (lastSepIndex !== -1) baseUrl = baseUrl.slice(0, lastSepIndex + 1);
	  }

	  var esModuleShimsSrc;

	  if (hasDocument) {
	    esModuleShimsSrc = document.currentScript && document.currentScript.src;
	  }

	  var backslashRegEx = /\\/g;

	  function resolveIfNotPlainOrUrl(relUrl, parentUrl) {
	    // strip off any trailing query params or hashes
	    parentUrl = parentUrl && parentUrl.split('#')[0].split('?')[0];
	    if (relUrl.indexOf('\\') !== -1) relUrl = relUrl.replace(backslashRegEx, '/'); // protocol-relative

	    if (relUrl[0] === '/' && relUrl[1] === '/') {
	      return parentUrl.slice(0, parentUrl.indexOf(':') + 1) + relUrl;
	    } // relative-url
	    else if (relUrl[0] === '.' && (relUrl[1] === '/' || relUrl[1] === '.' && (relUrl[2] === '/' || relUrl.length === 2 && (relUrl += '/')) || relUrl.length === 1 && (relUrl += '/')) || relUrl[0] === '/') {
	        var parentProtocol = parentUrl.slice(0, parentUrl.indexOf(':') + 1); // Disabled, but these cases will give inconsistent results for deep backtracking
	        //if (parentUrl[parentProtocol.length] !== '/')
	        //  throw new Error('Cannot resolve');
	        // read pathname from parent URL
	        // pathname taken to be part after leading "/"

	        var pathname;

	        if (parentUrl[parentProtocol.length + 1] === '/') {
	          // resolving to a :// so we need to read out the auth and host
	          if (parentProtocol !== 'file:') {
	            pathname = parentUrl.slice(parentProtocol.length + 2);
	            pathname = pathname.slice(pathname.indexOf('/') + 1);
	          } else {
	            pathname = parentUrl.slice(8);
	          }
	        } else {
	          // resolving to :/ so pathname is the /... part
	          pathname = parentUrl.slice(parentProtocol.length + (parentUrl[parentProtocol.length] === '/'));
	        }

	        if (relUrl[0] === '/') return parentUrl.slice(0, parentUrl.length - pathname.length - 1) + relUrl; // join together and split for removal of .. and . segments
	        // looping the string instead of anything fancy for perf reasons
	        // '../../../../../z' resolved to 'x/y' is just 'z'

	        var segmented = pathname.slice(0, pathname.lastIndexOf('/') + 1) + relUrl;
	        var output = [];
	        var segmentIndex = -1;

	        for (var i = 0; i < segmented.length; i++) {
	          // busy reading a segment - only terminate on '/'
	          if (segmentIndex !== -1) {
	            if (segmented[i] === '/') {
	              output.push(segmented.slice(segmentIndex, i + 1));
	              segmentIndex = -1;
	            }
	          } // new segment - check if it is relative
	          else if (segmented[i] === '.') {
	              // ../ segment
	              if (segmented[i + 1] === '.' && (segmented[i + 2] === '/' || i + 2 === segmented.length)) {
	                output.pop();
	                i += 2;
	              } // ./ segment
	              else if (segmented[i + 1] === '/' || i + 1 === segmented.length) {
	                  i += 1;
	                } else {
	                  // the start of a new segment as below
	                  segmentIndex = i;
	                }
	            } // it is the start of a new segment
	            else {
	                segmentIndex = i;
	              }
	        } // finish reading out the last segment


	        if (segmentIndex !== -1) output.push(segmented.slice(segmentIndex));
	        return parentUrl.slice(0, parentUrl.length - pathname.length) + output.join('');
	      }
	  }
	  /*
	   * Import maps implementation
	   *
	   * To make lookups fast we pre-resolve the entire import map
	   * and then match based on backtracked hash lookups
	   *
	   */


	  var emptyImportMap = {
	    imports: {},
	    scopes: {}
	  };

	  function resolveUrl(relUrl, parentUrl) {
	    return resolveIfNotPlainOrUrl(relUrl, parentUrl) || (relUrl.indexOf(':') !== -1 ? relUrl : resolveIfNotPlainOrUrl('./' + relUrl, parentUrl));
	  }

	  function hasStdModule(_x) {
	    return _hasStdModule.apply(this, arguments);
	  }

	  function _hasStdModule() {
	    _hasStdModule = asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee4(name) {
	      return regenerator.wrap(function _callee4$(_context4) {
	        while (1) {
	          switch (_context4.prev = _context4.next) {
	            case 0:
	              _context4.prev = 0;
	              _context4.next = 3;
	              return dynamicImport(name);

	            case 3:
	              return _context4.abrupt("return", true);

	            case 6:
	              _context4.prev = 6;
	              _context4.t0 = _context4["catch"](0);
	              return _context4.abrupt("return", false);

	            case 9:
	            case "end":
	              return _context4.stop();
	          }
	        }
	      }, _callee4, null, [[0, 6]]);
	    }));
	    return _hasStdModule.apply(this, arguments);
	  }

	  function resolveAndComposePackages(_x2, _x3, _x4, _x5, _x6) {
	    return _resolveAndComposePackages.apply(this, arguments);
	  }

	  function _resolveAndComposePackages() {
	    _resolveAndComposePackages = asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee5(packages, outPackages, baseUrl, parentMap, parentUrl) {
	      var p, resolvedLhs, target, _iterator5, _step5, rhs, mapped;

	      return regenerator.wrap(function _callee5$(_context5) {
	        while (1) {
	          switch (_context5.prev = _context5.next) {
	            case 0:
	              _context5.t0 = regenerator.keys(packages);

	            case 1:
	              if ((_context5.t1 = _context5.t0()).done) {
	                _context5.next = 43;
	                break;
	              }

	              p = _context5.t1.value;
	              resolvedLhs = resolveIfNotPlainOrUrl(p, baseUrl) || p;
	              target = packages[p];

	              if (!(typeof target === 'string')) {
	                _context5.next = 9;
	                break;
	              }

	              target = [target];
	              _context5.next = 11;
	              break;

	            case 9:
	              if (Array.isArray(target)) {
	                _context5.next = 11;
	                break;
	              }

	              return _context5.abrupt("continue", 1);

	            case 11:
	              _iterator5 = _createForOfIteratorHelper(target);
	              _context5.prev = 12;

	              _iterator5.s();

	            case 14:
	              if ((_step5 = _iterator5.n()).done) {
	                _context5.next = 32;
	                break;
	              }

	              rhs = _step5.value;

	              if (!(typeof rhs !== 'string')) {
	                _context5.next = 18;
	                break;
	              }

	              return _context5.abrupt("continue", 30);

	            case 18:
	              mapped = resolveImportMap(parentMap, resolveIfNotPlainOrUrl(rhs, baseUrl) || rhs, parentUrl);
	              _context5.t2 = mapped;

	              if (!_context5.t2) {
	                _context5.next = 27;
	                break;
	              }

	              _context5.t3 = !mapped.startsWith('std:');

	              if (_context5.t3) {
	                _context5.next = 26;
	                break;
	              }

	              _context5.next = 25;
	              return hasStdModule(mapped);

	            case 25:
	              _context5.t3 = _context5.sent;

	            case 26:
	              _context5.t2 = _context5.t3;

	            case 27:
	              if (!_context5.t2) {
	                _context5.next = 30;
	                break;
	              }

	              outPackages[resolvedLhs] = mapped;
	              return _context5.abrupt("continue", 1);

	            case 30:
	              _context5.next = 14;
	              break;

	            case 32:
	              _context5.next = 37;
	              break;

	            case 34:
	              _context5.prev = 34;
	              _context5.t4 = _context5["catch"](12);

	              _iterator5.e(_context5.t4);

	            case 37:
	              _context5.prev = 37;

	              _iterator5.f();

	              return _context5.finish(37);

	            case 40:
	              targetWarning(p, packages[p], 'bare specifier did not resolve');
	              _context5.next = 1;
	              break;

	            case 43:
	            case "end":
	              return _context5.stop();
	          }
	        }
	      }, _callee5, null, [[12, 34, 37, 40]]);
	    }));
	    return _resolveAndComposePackages.apply(this, arguments);
	  }

	  function resolveAndComposeImportMap(_x7, _x8, _x9) {
	    return _resolveAndComposeImportMap.apply(this, arguments);
	  }

	  function _resolveAndComposeImportMap() {
	    _resolveAndComposeImportMap = asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee6(json, baseUrl, parentMap) {
	      var outMap, s, resolvedScope;
	      return regenerator.wrap(function _callee6$(_context6) {
	        while (1) {
	          switch (_context6.prev = _context6.next) {
	            case 0:
	              outMap = {
	                imports: Object.assign({}, parentMap.imports),
	                scopes: Object.assign({}, parentMap.scopes)
	              };

	              if (!json.imports) {
	                _context6.next = 4;
	                break;
	              }

	              _context6.next = 4;
	              return resolveAndComposePackages(json.imports, outMap.imports, baseUrl, parentMap, null);

	            case 4:
	              if (!json.scopes) {
	                _context6.next = 13;
	                break;
	              }

	              _context6.t0 = regenerator.keys(json.scopes);

	            case 6:
	              if ((_context6.t1 = _context6.t0()).done) {
	                _context6.next = 13;
	                break;
	              }

	              s = _context6.t1.value;
	              resolvedScope = resolveUrl(s, baseUrl);
	              _context6.next = 11;
	              return resolveAndComposePackages(json.scopes[s], outMap.scopes[resolvedScope] || (outMap.scopes[resolvedScope] = {}), baseUrl, parentMap, resolvedScope);

	            case 11:
	              _context6.next = 6;
	              break;

	            case 13:
	              return _context6.abrupt("return", outMap);

	            case 14:
	            case "end":
	              return _context6.stop();
	          }
	        }
	      }, _callee6);
	    }));
	    return _resolveAndComposeImportMap.apply(this, arguments);
	  }

	  function getMatch(path, matchObj) {
	    if (matchObj[path]) return path;
	    var sepIndex = path.length;

	    do {
	      var segment = path.slice(0, sepIndex + 1);
	      if (segment in matchObj) return segment;
	    } while ((sepIndex = path.lastIndexOf('/', sepIndex - 1)) !== -1);
	  }

	  function applyPackages(id, packages) {
	    var pkgName = getMatch(id, packages);

	    if (pkgName) {
	      var pkg = packages[pkgName];
	      if (pkg === null) return;
	      if (id.length > pkgName.length && pkg[pkg.length - 1] !== '/') targetWarning(pkgName, pkg, "should have a trailing '/'");else return pkg + id.slice(pkgName.length);
	    }
	  }

	  function targetWarning(match, target, msg) {
	    console.warn("Package target " + msg + ", resolving target '" + target + "' for " + match);
	  }

	  function resolveImportMap(importMap, resolvedOrPlain, parentUrl) {
	    var scopeUrl = parentUrl && getMatch(parentUrl, importMap.scopes);

	    while (scopeUrl) {
	      var packageResolution = applyPackages(resolvedOrPlain, importMap.scopes[scopeUrl]);
	      if (packageResolution) return packageResolution;
	      scopeUrl = getMatch(scopeUrl.slice(0, scopeUrl.lastIndexOf('/')), importMap.scopes);
	    }

	    return applyPackages(resolvedOrPlain, importMap.imports) || resolvedOrPlain.indexOf(':') !== -1 && resolvedOrPlain;
	  }
	  /* es-module-lexer 0.3.13 */


	  function parse(Q) {
	    var B = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "@";
	    if (!A) return init.then(function () {
	      return parse(Q);
	    });
	    var C = (A.__heap_base.value || A.__heap_base) + 4 * Q.length + -A.memory.buffer.byteLength;
	    if (C > 0 && A.memory.grow(Math.ceil(C / 65536)), function (A, Q) {
	      var B = A.length;
	      var C = 0;

	      for (; C < B;) {
	        Q[C] = A.charCodeAt(C++);
	      }
	    }(Q, new Uint16Array(A.memory.buffer, A.sa(Q.length), Q.length + 1)), !A.parse()) throw Object.assign(new Error("Parse error ".concat(B, ":").concat(Q.slice(0, A.e()).split("\n").length, ":").concat(A.e() - Q.lastIndexOf("\n", A.e() - 1))), {
	      idx: A.e()
	    });
	    var E = [],
	        g = [];

	    for (; A.ri();) {
	      E.push({
	        s: A.is(),
	        e: A.ie(),
	        d: A.id()
	      });
	    }

	    for (; A.re();) {
	      g.push(Q.slice(A.es(), A.ee()));
	    }

	    return [E, g];
	  }

	  var A;
	  var init = WebAssembly.compile(function (A) {
	    return "function" == typeof atob ? Uint8Array.from(atob(A), function (A) {
	      return A.charCodeAt(0);
	    }) : Buffer.from(A, "base64");
	  }("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")).then(WebAssembly.instantiate).then(function (_ref) {
	    var Q = _ref.exports;
	    A = Q;
	  });

	  var WorkerShim = function WorkerShim(aURL) {
	    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

	    classCallCheck(this, WorkerShim);

	    if (options.type !== 'module') return new Worker(aURL, options);
	    if (!esModuleShimsSrc) throw new Error('es-module-shims.js must be loaded with a script tag for WorkerShim support.');
	    options.importMap = options.importMap || emptyImportMap;
	    var workerScriptUrl = createBlob("importScripts('".concat(esModuleShimsSrc, "');importShim.map=").concat(JSON.stringify(options.importMap), ";importShim('").concat(new URL(aURL, baseUrl).href, "').catch(e=>setTimeout(()=>{throw e}))"));
	    return new Worker(workerScriptUrl, Object.assign({}, options, {
	      type: undefined
	    }));
	  };

	  var id = 0;
	  var registry = {};

	  function loadAll(_x10, _x11) {
	    return _loadAll.apply(this, arguments);
	  }

	  function _loadAll() {
	    _loadAll = asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee7(load, seen) {
	      return regenerator.wrap(function _callee7$(_context7) {
	        while (1) {
	          switch (_context7.prev = _context7.next) {
	            case 0:
	              if (!(load.b || seen[load.u])) {
	                _context7.next = 2;
	                break;
	              }

	              return _context7.abrupt("return");

	            case 2:
	              seen[load.u] = 1;
	              _context7.next = 5;
	              return load.L;

	            case 5:
	              return _context7.abrupt("return", Promise.all(load.d.map(function (dep) {
	                return loadAll(dep, seen);
	              })));

	            case 6:
	            case "end":
	              return _context7.stop();
	          }
	        }
	      }, _callee7);
	    }));
	    return _loadAll.apply(this, arguments);
	  }

	  function topLevelLoad(_x12, _x13) {
	    return _topLevelLoad.apply(this, arguments);
	  }

	  function _topLevelLoad() {
	    _topLevelLoad = asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee8(url, source) {
	      var load, seen, module;
	      return regenerator.wrap(function _callee8$(_context8) {
	        while (1) {
	          switch (_context8.prev = _context8.next) {
	            case 0:
	              _context8.next = 2;
	              return init;

	            case 2:
	              load = getOrCreateLoad(url, source);
	              seen = {};
	              _context8.next = 6;
	              return loadAll(load, seen);

	            case 6:
	              lastLoad = undefined;
	              resolveDeps(load, seen);
	              _context8.next = 10;
	              return dynamicImport(load.b);

	            case 10:
	              module = _context8.sent;

	              if (!load.s) {
	                _context8.next = 15;
	                break;
	              }

	              _context8.next = 14;
	              return dynamicImport(load.s);

	            case 14:
	              _context8.sent.u$_(module);

	            case 15:
	              return _context8.abrupt("return", module);

	            case 16:
	            case "end":
	              return _context8.stop();
	          }
	        }
	      }, _callee8);
	    }));
	    return _topLevelLoad.apply(this, arguments);
	  }

	  function importShim$1(_x14, _x15) {
	    return _importShim$.apply(this, arguments);
	  }

	  function _importShim$() {
	    _importShim$ = asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee9(id, parentUrl) {
	      return regenerator.wrap(function _callee9$(_context9) {
	        while (1) {
	          switch (_context9.prev = _context9.next) {
	            case 0:
	              _context9.t0 = topLevelLoad;
	              _context9.next = 3;
	              return resolve(id, parentUrl || baseUrl);

	            case 3:
	              _context9.t1 = _context9.sent;
	              return _context9.abrupt("return", (0, _context9.t0)(_context9.t1));

	            case 5:
	            case "end":
	              return _context9.stop();
	          }
	        }
	      }, _callee9);
	    }));
	    return _importShim$.apply(this, arguments);
	  }

	  self.importShim = importShim$1;
	  var meta = {};
	  var wasmModules = {};
	  var edge = navigator.userAgent.match(/Edge\/\d\d\.\d+$/);
	  Object.defineProperties(importShim$1, {
	    map: {
	      value: emptyImportMap,
	      writable: true
	    },
	    m: {
	      value: meta
	    },
	    w: {
	      value: wasmModules
	    },
	    l: {
	      value: undefined,
	      writable: true
	    },
	    e: {
	      value: undefined,
	      writable: true
	    }
	  });

	  importShim$1.fetch = function (url) {
	    return fetch(url);
	  };

	  var lastLoad;

	  function resolveDeps(load, seen) {
	    if (load.b || !seen[load.u]) return;
	    seen[load.u] = 0;

	    var _iterator = _createForOfIteratorHelper(load.d),
	        _step;

	    try {
	      for (_iterator.s(); !(_step = _iterator.n()).done;) {
	        var dep = _step.value;
	        resolveDeps(dep, seen);
	      } // "execution"

	    } catch (err) {
	      _iterator.e(err);
	    } finally {
	      _iterator.f();
	    }

	    var source = load.S; // edge doesnt execute sibling in order, so we fix this up by ensuring all previous executions are explicit dependencies

	    var resolvedSource = edge && lastLoad ? "import '".concat(lastLoad, "';") : '';

	    var _load$a = slicedToArray(load.a, 1),
	        imports = _load$a[0];

	    if (!imports.length) {
	      resolvedSource += source;
	    } else {
	      // once all deps have loaded we can inline the dependency resolution blobs
	      // and define this blob
	      var lastIndex = 0,
	          depIndex = 0;

	      var _iterator2 = _createForOfIteratorHelper(imports),
	          _step2;

	      try {
	        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
	          var _step2$value = _step2.value,
	              start = _step2$value.s,
	              end = _step2$value.e,
	              dynamicImportIndex = _step2$value.d;

	          // dependency source replacements
	          if (dynamicImportIndex === -1) {
	            var depLoad = load.d[depIndex++];
	            var blobUrl = depLoad.b;

	            if (!blobUrl) {
	              // circular shell creation
	              if (!(blobUrl = depLoad.s)) {
	                blobUrl = depLoad.s = createBlob("export function u$_(m){".concat(depLoad.a[1].map(function (name) {
	                  return name === 'default' ? "$_default=m.default" : "".concat(name, "=m.").concat(name);
	                }).join(','), "}").concat(depLoad.a[1].map(function (name) {
	                  return name === 'default' ? "let $_default;export{$_default as default}" : "export let ".concat(name);
	                }).join(';'), "\n//# sourceURL=").concat(depLoad.r, "?cycle"));
	              }
	            } // circular shell execution
	            else if (depLoad.s) {
	                resolvedSource += source.slice(lastIndex, start - 1) + '/*' + source.slice(start - 1, end + 1) + '*/' + source.slice(start - 1, start) + blobUrl + source[end] + ";import*as m$_".concat(depIndex, " from'").concat(depLoad.b, "';import{u$_ as u$_").concat(depIndex, "}from'").concat(depLoad.s, "';u$_").concat(depIndex, "(m$_").concat(depIndex, ")");
	                lastIndex = end + 1;
	                depLoad.s = undefined;
	                continue;
	              }

	            resolvedSource += source.slice(lastIndex, start - 1) + '/*' + source.slice(start - 1, end + 1) + '*/' + source.slice(start - 1, start) + blobUrl;
	            lastIndex = end;
	          } // import.meta
	          else if (dynamicImportIndex === -2) {
	              meta[load.r] = {
	                url: load.r
	              };
	              resolvedSource += source.slice(lastIndex, start) + 'importShim.m[' + JSON.stringify(load.r) + ']';
	              lastIndex = end;
	            } // dynamic import
	            else {
	                resolvedSource += source.slice(lastIndex, dynamicImportIndex + 6) + 'Shim(' + source.slice(start, end) + ', ' + JSON.stringify(load.r);
	                lastIndex = end;
	              }
	        }
	      } catch (err) {
	        _iterator2.e(err);
	      } finally {
	        _iterator2.f();
	      }

	      resolvedSource += source.slice(lastIndex);
	    }

	    var sourceMappingResolved = '';
	    var sourceMappingIndex = resolvedSource.lastIndexOf('//# sourceMappingURL=');

	    if (sourceMappingIndex > -1) {
	      var sourceMappingEnd = resolvedSource.indexOf('\n', sourceMappingIndex);
	      var sourceMapping = resolvedSource.slice(sourceMappingIndex, sourceMappingEnd > -1 ? sourceMappingEnd : undefined);
	      sourceMappingResolved = "\n//# sourceMappingURL=" + resolveUrl(sourceMapping.slice(21), load.r);
	    }

	    load.b = lastLoad = createBlob(resolvedSource + sourceMappingResolved + '\n//# sourceURL=' + load.r);
	    load.S = undefined;
	  }

	  function getOrCreateLoad(url, source) {
	    var load = registry[url];
	    if (load) return load;
	    load = registry[url] = {
	      // url
	      u: url,
	      // response url
	      r: undefined,
	      // fetchPromise
	      f: undefined,
	      // source
	      S: undefined,
	      // linkPromise
	      L: undefined,
	      // analysis
	      a: undefined,
	      // deps
	      d: undefined,
	      // blobUrl
	      b: undefined,
	      // shellUrl
	      s: undefined
	    };
	    if (url.startsWith('std:')) return Object.assign(load, {
	      r: url,
	      f: resolvedPromise,
	      L: resolvedPromise,
	      b: url
	    });
	    load.f = asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee() {
	      var res, contentType, module, deps, aDeps, depStrs, curIndex;
	      return regenerator.wrap(function _callee$(_context) {
	        while (1) {
	          switch (_context.prev = _context.next) {
	            case 0:
	              if (source) {
	                _context.next = 52;
	                break;
	              }

	              _context.next = 3;
	              return importShim$1.fetch(url);

	            case 3:
	              res = _context.sent;

	              if (res.ok) {
	                _context.next = 6;
	                break;
	              }

	              throw new Error("".concat(res.status, " ").concat(res.statusText, " ").concat(res.url));

	            case 6:
	              load.r = res.url;
	              contentType = res.headers.get('content-type');

	              if (!contentType.match(/^(text|application)\/(x-)?javascript(;|$)/)) {
	                _context.next = 14;
	                break;
	              }

	              _context.next = 11;
	              return res.text();

	            case 11:
	              source = _context.sent;
	              _context.next = 52;
	              break;

	            case 14:
	              if (!contentType.match(/^application\/json(;|$)/)) {
	                _context.next = 24;
	                break;
	              }

	              _context.t0 = "export default JSON.parse(";
	              _context.t1 = JSON;
	              _context.next = 19;
	              return res.text();

	            case 19:
	              _context.t2 = _context.sent;
	              _context.t3 = _context.t1.stringify.call(_context.t1, _context.t2);
	              source = _context.t0.concat.call(_context.t0, _context.t3, ")");
	              _context.next = 52;
	              break;

	            case 24:
	              if (!contentType.match(/^text\/css(;|$)/)) {
	                _context.next = 34;
	                break;
	              }

	              _context.t4 = "const s=new CSSStyleSheet();s.replaceSync(";
	              _context.t5 = JSON;
	              _context.next = 29;
	              return res.text();

	            case 29:
	              _context.t6 = _context.sent;
	              _context.t7 = _context.t5.stringify.call(_context.t5, _context.t6);
	              source = _context.t4.concat.call(_context.t4, _context.t7, ");export default s");
	              _context.next = 52;
	              break;

	            case 34:
	              if (!contentType.match(/^application\/wasm(;|$)/)) {
	                _context.next = 51;
	                break;
	              }

	              _context.t8 = WebAssembly;
	              _context.next = 38;
	              return res.arrayBuffer();

	            case 38:
	              _context.t9 = _context.sent;
	              _context.next = 41;
	              return _context.t8.compile.call(_context.t8, _context.t9);

	            case 41:
	              module = wasmModules[url] = _context.sent;
	              deps = WebAssembly.Module.imports ? WebAssembly.Module.imports(module).map(function (impt) {
	                return impt.module;
	              }) : [];
	              aDeps = [];
	              load.a = [aDeps, WebAssembly.Module.exports(module).map(function (expt) {
	                return expt.name;
	              })];
	              depStrs = deps.map(function (dep) {
	                return JSON.stringify(dep);
	              });
	              curIndex = 0;
	              load.S = depStrs.map(function (depStr, idx) {
	                var index = idx.toString();
	                var strStart = curIndex + 17 + index.length;
	                var strEnd = strStart + depStr.length - 2;
	                aDeps.push({
	                  s: strStart,
	                  e: strEnd,
	                  d: -1
	                });
	                curIndex += strEnd + 3;
	                return "import*as m".concat(index, " from").concat(depStr, ";");
	              }).join('') + "const module=importShim.w[".concat(JSON.stringify(url), "],exports=new WebAssembly.Instance(module,{") + depStrs.map(function (depStr, idx) {
	                return "".concat(depStr, ":m").concat(idx, ",");
	              }).join('') + "}).exports;" + load.a[1].map(function (name) {
	                return name === 'default' ? "export default exports.".concat(name) : "export const ".concat(name, "=exports.").concat(name);
	              }).join(';');
	              return _context.abrupt("return", deps);

	            case 51:
	              throw new Error("Unknown Content-Type \"".concat(contentType, "\""));

	            case 52:
	              try {
	                load.a = parse(source, load.u);
	              } catch (e) {
	                console.warn(e);
	                load.a = [[], []];
	              }

	              load.S = source;
	              return _context.abrupt("return", load.a[0].filter(function (d) {
	                return d.d === -1;
	              }).map(function (d) {
	                return source.slice(d.s, d.e);
	              }));

	            case 55:
	            case "end":
	              return _context.stop();
	          }
	        }
	      }, _callee);
	    }))();
	    load.L = load.f.then( /*#__PURE__*/function () {
	      var _ref3 = asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee3(deps) {
	        return regenerator.wrap(function _callee3$(_context3) {
	          while (1) {
	            switch (_context3.prev = _context3.next) {
	              case 0:
	                _context3.next = 2;
	                return Promise.all(deps.map( /*#__PURE__*/function () {
	                  var _ref4 = asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(depId) {
	                    var depLoad;
	                    return regenerator.wrap(function _callee2$(_context2) {
	                      while (1) {
	                        switch (_context2.prev = _context2.next) {
	                          case 0:
	                            _context2.t0 = getOrCreateLoad;
	                            _context2.next = 3;
	                            return resolve(depId, load.r || load.u);

	                          case 3:
	                            _context2.t1 = _context2.sent;
	                            depLoad = (0, _context2.t0)(_context2.t1);
	                            _context2.next = 7;
	                            return depLoad.f;

	                          case 7:
	                            return _context2.abrupt("return", depLoad);

	                          case 8:
	                          case "end":
	                            return _context2.stop();
	                        }
	                      }
	                    }, _callee2);
	                  }));

	                  return function (_x17) {
	                    return _ref4.apply(this, arguments);
	                  };
	                }()));

	              case 2:
	                load.d = _context3.sent;

	              case 3:
	              case "end":
	                return _context3.stop();
	            }
	          }
	        }, _callee3);
	      }));

	      return function (_x16) {
	        return _ref3.apply(this, arguments);
	      };
	    }());
	    return load;
	  }

	  var importMapPromise;

	  if (hasDocument) {
	    // preload import maps
	    var _iterator3 = _createForOfIteratorHelper(document.querySelectorAll('script[type="importmap-shim"][src]')),
	        _step3;

	    try {
	      for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
	        var script = _step3.value;
	        script._f = fetch(script.src);
	      } // load any module scripts

	    } catch (err) {
	      _iterator3.e(err);
	    } finally {
	      _iterator3.f();
	    }

	    var _iterator4 = _createForOfIteratorHelper(document.querySelectorAll('script[type="module-shim"]')),
	        _step4;

	    try {
	      for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
	        var _script = _step4.value;
	        topLevelLoad(_script.src || "".concat(baseUrl, "?").concat(id++), _script.src ? null : _script.innerHTML);
	      }
	    } catch (err) {
	      _iterator4.e(err);
	    } finally {
	      _iterator4.f();
	    }
	  }

	  function resolve(_x18, _x19) {
	    return _resolve.apply(this, arguments);
	  }

	  function _resolve() {
	    _resolve = asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee11(id, parentUrl) {
	      var _iterator6, _step6, _loop;

	      return regenerator.wrap(function _callee11$(_context11) {
	        while (1) {
	          switch (_context11.prev = _context11.next) {
	            case 0:
	              if (!importMapPromise) {
	                importMapPromise = resolvedPromise;

	                if (hasDocument) {
	                  _iterator6 = _createForOfIteratorHelper(document.querySelectorAll('script[type="importmap-shim"]'));

	                  try {
	                    _loop = function _loop() {
	                      var script = _step6.value;
	                      importMapPromise = importMapPromise.then( /*#__PURE__*/asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee10() {
	                        return regenerator.wrap(function _callee10$(_context10) {
	                          while (1) {
	                            switch (_context10.prev = _context10.next) {
	                              case 0:
	                                _context10.t0 = resolveAndComposeImportMap;

	                                if (!script.src) {
	                                  _context10.next = 9;
	                                  break;
	                                }

	                                _context10.next = 4;
	                                return script._f || fetch(script.src);

	                              case 4:
	                                _context10.next = 6;
	                                return _context10.sent.json();

	                              case 6:
	                                _context10.t1 = _context10.sent;
	                                _context10.next = 10;
	                                break;

	                              case 9:
	                                _context10.t1 = JSON.parse(script.innerHTML);

	                              case 10:
	                                _context10.t2 = _context10.t1;
	                                _context10.t3 = script.src || baseUrl;
	                                _context10.t4 = importShim$1.map;
	                                _context10.next = 15;
	                                return (0, _context10.t0)(_context10.t2, _context10.t3, _context10.t4);

	                              case 15:
	                                importShim$1.map = _context10.sent;

	                              case 16:
	                              case "end":
	                                return _context10.stop();
	                            }
	                          }
	                        }, _callee10);
	                      })));
	                    };

	                    for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
	                      _loop();
	                    }
	                  } catch (err) {
	                    _iterator6.e(err);
	                  } finally {
	                    _iterator6.f();
	                  }
	                }
	              }

	              _context11.next = 3;
	              return importMapPromise;

	            case 3:
	              return _context11.abrupt("return", resolveImportMap(importShim$1.map, resolveIfNotPlainOrUrl(id, parentUrl) || id, parentUrl) || throwUnresolved(id, parentUrl));

	            case 4:
	            case "end":
	              return _context11.stop();
	          }
	        }
	      }, _callee11);
	    }));
	    return _resolve.apply(this, arguments);
	  }

	  function throwUnresolved(id, parentUrl) {
	    throw Error("Unable to resolve specifier '" + id + (parentUrl ? "' from " + parentUrl : "'"));
	  }

	  self.WorkerShim = WorkerShim;
	})();

}());
