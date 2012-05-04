steal("can/util/fixture", "can/model",'funcunit/qunit', function(){

module("can/util/fixture");

test("static fixtures", function(){
	stop();
	
	can.fixture("GET something", "//can/util/fixture/fixtures/test.json");
	can.fixture("POST something", "//can/util/fixture/fixtures/test.json");

	can.ajax({
		url : 'something',
		dataType : 'json'
	}).done(function(data) {
		equals(data.sweet,"ness","can.get works");
		can.ajax({
			url : 'something',
			method : 'POST',
			dataType : 'json'
		}).done(function(data) {
			equals(data.sweet,"ness","can.post works");
			start();
		});
		start();
	});
})

test("dynamic fixtures",function(){
	stop();
	can.fixture.delay = 10;
	can.fixture("something", function(){
		return [{sweet: "ness"}]
	});

	can.ajax({
		url : 'something',
		dataType : 'json'
	}).done(function(data) {
		equals(data.sweet,"ness","can.get works");
		start();	
	});
});

test("fixture function", 3, function(){
	stop();
	var url = steal.root.join("can/util/fixture/fixtures/foo.json")+'';
	can.fixture(url,"//can/util/fixture/fixtures/foobar.json" );

	can.ajax({
		url : url,
		dataType : 'json'
	}).done(function(data){
		equals(data.sweet,"ner","url passed works");
		can.fixture(url,"//can/util/fixture/fixtures/test.json" );

		can.ajax({
			url : url,
			dataType : 'json'
		}).done(function(data){
			equals(data.sweet,"ness","replaced");
			can.fixture(url, null );

			can.ajax({
				url : url,
				dataType : 'json'
			}).done(function(data){
				equals(data.a,"b","removed");
				start();
			})
		});
	});
});

// Converters only work with jQuery
if(typeof jQuery !== 'undefined') {
	test("fixtures with converters", function(){
		stop();
		can.ajax( {
		  url : steal.root.join("can/util/fixture/fixtures/foobar.json")+'',
		  dataType: "json fooBar",
		  converters: {
		    "json fooBar": function( data ) {
		      // Extract relevant text from the xml document
		      return "Mr. "+data.name;
		    }
		  },
		  fixture : function(){
		    return {
				name : "Justin"
			}
		  },
		  success : function(prettyName){
		    start();
			equals(prettyName, "Mr. Justin")
		  }
		});
	})
}

test("can.fixture.make fixtures",function(){
	stop();
	can.fixture.make('thing', 1000, function(i){
		return {
			id: i,
			name: "thing "+i
		}
	}, 
	function(item, settings){
		if(settings.data.searchText){
			var regex = new RegExp("^"+settings.data.searchText)
			return regex.test(item.name);
		}
	})
	can.ajax({
		url: "things",
		dataType: "json",
		data: {
			offset: 100,
			limit: 200,
			order: ["name ASC"],
			searchText: "thing 2"
		},
		fixture: "-things",
		success: function(things){
			equals(things.data[0].name, "thing 29", "first item is correct")
			equals(things.data.length, 11, "there are 11 items")
			start();
		}
	})
});

test("simulating an error", function(){
	var st = '{type: "unauthorized"}';
	
	can.fixture("/foo", function(){
		return [401,st]
	});
	stop();
	
	can.ajax({
		url : "/foo",
		dataType : 'json'
	}).done(function(){
		ok(false, "success called");
		start();
	}).fail(function(dfd){
		ok(true, "error called");
		start();
	});
})

test("rand", function(){
	var rand = can.fixture.rand;
	var num = rand(5);
	equals(typeof num, "number");
	ok(num >= 0 && num < 5, "gets a number" );
	
	stop();
	var zero, three, between, next = function(){
		start();
	}
	
	// make sure rand can be everything we need
	setTimeout(function(){
		var res = rand([1,2,3]);
		
		if(res.length == 0 ){
			zero = true;
		} else if(res.length == 3){
			three = true;
		} else {
			between  = true;
		}
		
		if(zero && three && between){
			ok(true, "got zero, three, between")
			next();
		} else {
			setTimeout(arguments.callee, 10)
		}
	}, 10)
});


test("_getData", function(){
	var data = can.fixture._getData("/thingers/{id}", "/thingers/5");
	equals(data.id, 5, "gets data");
	var data = can.fixture._getData("/thingers/5?hi.there", "/thingers/5?hi.there");
	deepEqual(data, {}, "gets data");
})

test("_getData with double character value", function(){
	var data = can.fixture._getData("/days/{id}/time_slots.json", "/days/17/time_slots.json");
	equals(data.id, 17, "gets data");
});

test("_compare", function(){
	var same = can.Object.same(
		{url : "/thingers/5"},
		{url : "/thingers/{id}"}, can.fixture._compare)
	
	ok(same, "they are similar");
	
	same = can.Object.same(
		{url : "/thingers/5"},
		{url : "/thingers"}, can.fixture._compare);
		
	ok(!same, "they are not the same");
})

test("_similar", function(){
		var same = can.fixture._similar(
		{url : "/thingers/5"},
		{url : "/thingers/{id}"});
		
	ok(same, "similar");
	
	same = can.fixture._similar(
		{url : "/thingers/5", type: "get"},
		{url : "/thingers/{id}"});
		
	ok(same, "similar with extra pops on settings");
	
	var exact = can.fixture._similar(
		{url : "/thingers/5", type: "get"},
		{url : "/thingers/{id}"}, true);
	
	ok(!exact, "not exact" )
	
	var exact = can.fixture._similar(
		{url : "/thingers/5"},
		{url : "/thingers/5"}, true);
		
	ok(exact, "exact" )
})

test("fixture function gets id", function(){
	can.fixture("/thingers/{id}", function(settings){
		return {
			id: settings.data.id,
			name: "justin"
		}
	})
	
	stop();

	can.ajax({
		url : "/thingers/5",
		dataType : 'json',
		data : {
			id : 5
		}
	}).done(function(data) {
		ok(data.id)
		start();
	});
});

test("replacing and removing a fixture", function(){
	var url = steal.root.join("can/util/fixture/fixtures/remove.json")+''
	can.fixture("GET "+url, function(){
		return {weird: "ness!"}
	});
	
	stop();

	can.ajax({
		url : url,
		dataType : 'json'
	}).done(function(json) {
		equals(json.weird,"ness!","fixture set right");
		can.fixture("GET "+url, function(){
			return {weird: "ness?"}
		});

		can.ajax({
			url : url,
			dataType : 'json'
		}).done(function(json) {
			equals(json.weird,"ness?","fixture set right");
			can.fixture("GET "+url, null );
			can.ajax({
				url : url,
				dataType : 'json'
			}).done(function(json) {
				equals(json.weird,"ness","fixture set right");
				start();
			});
		});
	});
});

});
