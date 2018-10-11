"use strict";
var namespace = require("can-namespace");
var canSymbol = require("can-symbol");

// Contains stack of observation records created by pushing with `.start`
// and popping with `.stop()`.
// The top of the stack is the "target" observation record - the record that calls
// to `ObservationRecorder.add` get added to.
var stack = [];

var addParentSymbol = canSymbol.for("can.addParent");

var ObservationRecorder = {
    stack: stack,
    start: function(){
    	var deps = {
            keyDependencies: new Map(),
            valueDependencies: new Set(),
						childDependencies: new Set(),

            // `traps` and `ignore` are here only for performance
            // reasons. They work with `ObservationRecorder.ignore` and `ObservationRecorder.trap`.
            traps: null,
            ignore: 0
    	};

        stack.push(deps);

        return deps;
    },
    stop: function() {
    	return stack.pop();
    },

    add: function(obj, event) {
        var top = stack[stack.length-1];
    	if (top && top.ignore === 0) {

    		if(top.traps) {
    			top.traps.push([obj, event]);
    		}
    		else {
                // Use `=== undefined` instead of `arguments.length` for performance.
                if(event === undefined) {
                    top.valueDependencies.add(obj);
                } else {
                    var eventSet = top.keyDependencies.get(obj);
        			if(!eventSet) {
        				eventSet = new Set();
        				top.keyDependencies.set(obj, eventSet);
        			}
        			eventSet.add(event);
                }
    		}
    	}
    },

    addMany: function(observes){
        var top = stack[stack.length-1];
    	if (top) {
    		if(top.traps) {
    			top.traps.push.apply(top.traps, observes);
    		} else {
    			for(var i =0, len = observes.length; i < len; i++) {
                    this.add(observes[i][0],observes[i][1]);
    			}
    		}
    	}
    },
		created: function(obs){
			var top = stack[stack.length - 1];
			if(top) {
				top.childDependencies.add(obs);
				if(obs[addParentSymbol]) {
					obs[addParentSymbol](top);
				}
			}
		},
    ignore: function(fn){
    	return function(){
    		if (stack.length) {
    			var top = stack[stack.length-1];
    			top.ignore++;
    			var res = fn.apply(this, arguments);
    			top.ignore--;
    			return res;
    		} else {
    			return fn.apply(this, arguments);
    		}
    	};
    },
    isRecording: function(){
    	var len = stack.length;
    	var last = len && stack[len-1];
    	return last && (last.ignore === 0) && last;
    },
    // `can-observation` uses this to do diffs more easily.
    makeDependenciesRecord: function(){
        return {
            traps: null,
            keyDependencies: new Map(),
            valueDependencies: new Set(),
						//childDependencies: new Set(),
            ignore: 0
        };
    },
    // The following are legacy methods we should do away with.
    makeDependenciesRecorder: function(){
        return ObservationRecorder.makeDependenciesRecord();
    },
    // Traps should be replace by calling `.start()` and `.stop()`.
    // To do this, we'd need a method that accepts a dependency record.
    trap: function(){
    	if (stack.length) {
    		var top = stack[stack.length-1];
    		var oldTraps = top.traps;
    		var traps = top.traps = [];
    		return function(){
    			top.traps = oldTraps;
    			return traps;
    		};
    	} else {
    		return function(){return [];};
    	}
    },
    trapsCount: function(){
    	if (stack.length) {
    		var top = stack[stack.length-1];
    		return top.traps.length;
    	} else {
    		return 0;
    	}
    }
};

if (namespace.ObservationRecorder) {
	throw new Error("You can't have two versions of can-observation-recorder, check your dependencies");
} else {
	module.exports = namespace.ObservationRecorder = ObservationRecorder;
}
