var express = require('express');
var router = express.Router();



var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

// Connection URL
var url = 'mongodb://localhost:27017/webfish';
// Use connect method to connect to the Server


//var mongo = require('mongoskin');
//var db = mongo.db('mongodb://localhost:27017/webfish');


/* GET users listing. */
router.get('/', function(req, res, next) {
  //res.send('do some analysis here!');
   res.render('analysis', { title: 'Express', data:[{name:"a"},{name:"b"},{name:"c"}] });
});

router.get('/summarystats/:mode/:level',function(req,res){
    var level = parseInt(req.params.level);
    var mode = req.params.mode;
    var collection = db.get("gamesummary");

    collection.col.aggregate([
        {$match: {level: level, mode:mode}},
        {$group: 
        {_id:"total",
         tries:  {$sum: "$summary.tries"},
         correct:{$sum: "$summary.correct"},
         time:{$sum: "$summary.totalTime"},
         count:{$sum: 1}  
        }}],
      function(err,result){
		  console.log('done');
			res.json({done:true});          
      }    );

})

router.get('/mapreduce/:mode/:level',function(req,res){
    var level = parseInt(req.params.level);
    var mode = req.params.mode;

	MongoClient.connect(url, function(err, db) {
	  assert.equal(null, err);
	  console.log("Connected correctly to server");
	  //var collection = db.collection('gamestats');
	  

	  var mapper = 
	  	function(){	
			var mode = "visual"
			var z = this.stats.fast.fast;	
			var ff = {tries:z.tries, correct:z.correct, missed:z.missed, time:z.time};
			var z = this.stats.fast.slow;	
			var fs={tries:z.tries, correct:z.correct, missed:z.missed, time:z.time};
			var z = this.stats.fast.none;	
			var fn = {tries:z.tries, correct:z.correct, missed:z.missed, time:z.time};
			var z = this.stats.slow.fast;	
			var sf = {tries:z.tries, correct:z.correct, missed:z.missed, time:z.time};
			var z = this.stats.slow.slow;	
			var ss = {tries:z.tries, correct:z.correct, missed:z.missed, time:z.time};
			var z = this.stats.slow.none;	
			var sn= {tries:z.tries, correct:z.correct, missed:z.missed, time:z.time};
			var z = this.stats.none.fast;	
			var nf= {tries:z.tries, correct:z.correct, missed:z.missed, time:z.time};
			var z = this.stats.none.slow;	
			var ns= {tries:z.tries, correct:z.correct, missed:z.missed, time:z.time};
			var z = this.stats.none.none;	
			var nn = {tries:z.tries, correct:z.correct, missed:z.missed, time:z.time};

			var tries = 
			 ff.tries   + fs.tries   + fn.tries   + sf.tries   + ss.tries   + sn.tries   + nf.tries   + ns.tries ;
			var correct = 
 			 ff.correct + fs.correct + fn.correct + sf.correct + ss.correct + sn.correct + nf.correct + ns.correct;
			var accuracy = correct*100.0/tries;
			if (accuracy < 50) return;
			//if (this.level< 1) return;
			//if (this.mode!=mode) return;
			emit("ff", ff); 
			emit("fs", fs);
			emit("fn", fn);
			emit("sf", sf); 
			emit("ss", ss); 
			emit("sn", sn); 
			emit("nf", nf); 
			emit("ns", ns); 
			emit("nn", nn); 
			
			
		};
	  var reducer = function(user,counts){
			var summary={tries:0,correct:0,missed:0,time:0};
			for(var i = 0; i<counts.length; i++){
				var x=counts[i];
				summary.tries += x.tries;
				summary.correct += x.correct;
				summary.missed += x.missed;
				summary.time += x.time;
			}
			return summary;
		};

	  db.collection('gamestats').mapReduce(mapper,reducer,
	  	{out:"stats_by_user",
		  query:{mode:mode,level:{$gt:level}},
		  finalize: function(key,v){
			  var results = {accuracy:v.correct*100/v.tries,rt:v.time/v.correct,raw:v};
			  return results;
		  }
		},
	  	function(e,r){
			console.dir({e:e,r:r,m:"processed mapReduce results"});
			var con={name:"con",tries:0,correct:0,time:0}; 
			var non={name:"non",tries:0,correct:0,time:0}; 
			var odd={name:"odd",tries:0,correct:0,time:0};
			var summarize = function(r){
//				_.each(r,function(v){
				for(var j in r){
					var v = r[j];
					var obj;
					if (v._id == "ff" || v._id=="ss") {obj = con;}
					else if (v._id == "fs" || v._id=="sf") {obj = non;}
					else {obj = odd;}
					console.log("\n\n\nobj="+JSON.stringify(obj)+"\nv="+JSON.stringify(v))
					obj.tries += v.value.raw.tries;
					obj.correct += v.value.raw.correct;
					obj.time += v.value.raw.time;
					console.log("\n\n\nobj="+JSON.stringify(obj))
				};
				
				var result = {con:con, non:non,odd:odd};
				for (var k in result){
					result[k].accuracy = result[k].correct*100/result[k].tries;
					result[k].rt = result[k].time/result[k].correct;
				}
			
				
				return result ;
			}
			
	  	  	db.collection('stats_by_user').find().toArray(
	  		  function(e,r){
	  			  console.dir("r="+JSON.stringify(r)+"e="+e);

				  res.render("mapreduce",{title:"mapreduce",mode:mode,level:level, data:r,data2:summarize(r)});
	  			  //res.json(r);
	  			  db.close();
	  		  }
	  	  );
		}
	  );
	  
		  
	  
	});
    
})

router.get('/stats',function(req,res){

	MongoClient.connect(url, function(err, db) {
	  assert.equal(null, err);
	  console.log("Connected correctly to server");
	  db.collection('stats_by_user').find().toArray(
		  function(e,r){
			  console.dir("r="+r+"e="+e);

			  res.json(r);
			  db.close();
		  }
	  );
  	});
});

router.get('/allstats/:mode/:level',function(req,res){
    var level = parseInt(req.params.level);
    var mode = req.params.mode;
	console.dir({mode:mode,level:level});
	MongoClient.connect(url, function(err, db) {
	  assert.equal(null, err);
	  console.log("Connected correctly to server");
	  db.collection('gamestats').find({mode:mode,level:{$gt:level}}).toArray(
		  function(e,r){
			  console.dir("r="+r+"e="+e);
			  res.json(r);
			  db.close();
		  }
	  );
  	});
})


// this will return the data in a flat style using csv
router.get('/allstats2',function(req,res){
   // var level = parseInt(req.params.level);
   // var mode = req.params.mode;
	// console.dir({mode:mode,level:level});
	
	var flatten = function(r){
		var result=[];
		for(var i in r){
			var x = r[i];
			console.log("x="+JSON.stringify(x));
			var types=["fast","slow","none"];
			for(var j in types){
				for(var k in types){
					var z = x.stats[types[j]][types[k]];
					z.mode=x.mode;
					z.level=x.level;
					z.age = x.age;
					z.uid = x.user;
					z.gid = x._id;
					result.push(z);
				}
			}
		}
		return result;
	}
	
	MongoClient.connect(url, function(err, db) {
	  assert.equal(null, err);
	  console.log("Connected correctly to server");
	  db.collection('gamestats').find().toArray(
		  function(e,r){
			  console.dir("r="+r+"e="+e);
			  //res.json(flatten(r));
			  res.render("radata",{ data:flatten(r)});
			  db.close();
		  }
	  );
  	});
})

module.exports = router;
