var ctx;
var canvas;
var width = 800;
var height = 800;
var size = Math.PI / 2;
var barWidth = 30;
var barRadius = 80;
var position = Math.PI * 1.5 - size * .5;
var speed = 0;
var energies = [];
var mouseDown = false;
var mousePos = {x: 0, y: 0};
var coolDown = 0;
var coolDownDir = 1;
var energyFrequency = 100;
var nextEnergy = energyFrequency;
var audio;
var osc;
var gainNode;
var sounds = {};
var muted = false;
var graphics = {};
var frameNo = 0;
var startTime = -1;
var score;
var end = false;
var scores = [];

var orig = "https://boltkey.cz/Dynamo/";

function main() {
	
	sounds.dzzt = [];
	for (var i = 0; i < 10; ++i) {
		sounds.dzzt[i] = new Audio("dzzt.wav");
		sounds.dzzt[i].loop = false;
	}
	sounds.dzzt.i = 0;
	sounds.wyaou = new Audio("wyawou.wav");
	sounds.wyaou.loop = false;
	sounds.broken = new Audio("break.wav");
	sounds.broken.loop = false;
	for (var i of ["sipky", "dynamo"]) {
		var img = new Image();
		img.src = i + ".png";
		graphics[i] = img;
	}
	
	graphics.back = [];
	for (var i = 0; i <= 7; ++i) {
		var img = new Image();
		img.src = "back" + i + ".png"
		graphics.back[i] = img;
	}		
	
	canvas = $("canvas")[0];
	document.addEventListener('keydown', function(e) {
		console.log(e);
		switch(e.code) {
			case "ArrowDown":
			case "ArrowUp":
				position += Math.PI;
				if (startTime === -1)
					startTime = frameNo;
				break;
			case "ArrowLeft": 
				position += Math.PI * 3/2;
				if (startTime === -1)
					startTime = frameNo;
				break;
			case "ArrowRight":
				position += Math.PI * 1/2;
				if (startTime === -1)
					startTime = frameNo;
				break;
			case "KeyM":
				muted = !muted;
				gainNode.gain.value = muted ? 0 : 5;
				break;
			case "KeyR":
				startTime = frameNo;
				end = false;
				speed = 0;
				energies = [];
				break;
		}
	});
	ctx = canvas.getContext("2d");
	console.log("main");
	ctx.translate(width / 2, height / 2);
	limitLoop(update);
}


function Energy(x, y) {
	this.x = x;
	this.y = y;
	this.ded = false;
	var dir = Math.random() * Math.PI * 2;
	this.speedX = Math.cos(dir);
	this.speedY = Math.sin(dir);
	this.timeSinceImpact = 1000;
	this.update = function() {
		this.speedX *= 0.999;
		this.speedY *= 0.999;
		this.timeSinceImpact += 1;
		
		this.x += this.speedX;
		this.y += this.speedY;
		var dist = this.distFromOrigin();
		var force = 1/(Math.pow(dist, 2)) * 10;
		this.speedX += -this.x * force;
		this.speedY += -this.y * force;
		var polar = -(Math.atan2(this.x, this.y) - Math.PI * 0.5);
		var dirCorrect = false;
		for (var i = -2; i < 2; ++i) {
			if (polar > position % (Math.PI * 2) + i * Math.PI * 2 &&
			polar < position % (Math.PI * 2) + i * Math.PI * 2 + size + speed) {
				dirCorrect = true;
			}
		}
		if (this.distFromOrigin() < barRadius + barWidth && 
		    this.distFromOrigin() > barRadius && 
			dirCorrect &&
			!this.ded &&
			!end &&
			this.timeSinceImpact > 20) {
			//this.ded = true;
			if (!audio) {
				audio = new AudioContext();
				gainNode = audio.createGain();
				gainNode.gain.value = muted ? 0 : 5;
				gainNode.connect(audio.destination);
				osc = audio.createOscillator();
				osc.connect(gainNode);
				osc.start(0);
			}
			osc.frequency.value = (speed*60) / (Math.PI * 2);
			polar += (Math.random() - 0.5) * 0.01;
			this.speedX = Math.cos(polar) * 5;
			this.speedY = Math.sin(polar) * 5;
			speed += 0.005;
			speed = Math.min(speed, 2.28);
			if (!muted) {
				sounds.dzzt[sounds.dzzt.i++].play();
				sounds.dzzt.i %= 10;
			}
			this.timeSinceImpact = 0;
		}
		if (this.distFromOrigin() < barRadius * 0.8) {
			this.ded = true;
		}
	}
	this.distFromOrigin = function() {
		return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
	}
	this.draw = function() {
		ctx.beginPath();
		ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
		var b = Math.max(0, 255 - this.timeSinceImpact * 5);
		b = Math.max(Math.floor((speed-1) * 255), b);
		b = Math.min(255, b);
		ctx.fillStyle = "rgb(255, 255, " + b + ")";
		ctx.fill();
		
		if (this.timeSinceImpact < 9) {
			var polar = -(Math.atan2(this.x, this.y) - Math.PI * 0.5);
			
			ctx.beginPath();
			ctx.moveTo(this.x, this.y);
			for (var i = 0; i < this.timeSinceImpact; ++i) {
				ctx.lineTo(
					Math.cos(polar) * (this.distFromOrigin() - i * 5) + Math.random() * 10 - 5,
					Math.sin(polar) * (this.distFromOrigin() - i * 5) + Math.random() * 10 - 5);
			}
			ctx.strokeStyle = "yellow";
			ctx.lineWidth = 4;
			ctx.stroke();
			ctx.lineWidth = 2;
			ctx.strokeStyle = "white";
			ctx.stroke();
		}
	}
}

function draw() {
	ctx.clearRect(-width/2, -height/2, width, height);
	
	ctx.fillStyle = "black";
	ctx.globalAlpha = 1;
	ctx.fillRect(-width/2, -height/2, width, height);
	
	var speedThresholds = [0.0, 0.20, 0.35, 0.60, 0.8, 1.2, 1.7, 2.3];
	for (var imgNo = 0; speedThresholds[imgNo] <= speed; ++imgNo) {}
	if (!imgNo) {
		imgNo = 1;
	}
	ctx.drawImage(graphics.back[imgNo-1], -width/2, -height/2);
	ctx.globalAlpha = (speed - speedThresholds[imgNo-1]) / (speedThresholds[imgNo] - speedThresholds[imgNo-1]);
	ctx.drawImage(graphics.back[imgNo], -width/2, -height/2);
	
	
	ctx.fillStyle = "white";
	for (var i = 1; i < 30; ++i) {
		ctx.beginPath();
		
		ctx.arc(0, 0, barRadius, position + size, position + size - speed * i/6, 1);
		ctx.arc(0, 0, barRadius + barWidth, position + size - speed * i/6, position + size );
		ctx.globalAlpha = 0.7 - i * 0.02;
		ctx.fill();
	}
	
	var offsetX = Math.random() * (Math.max(0, speed - 1)) * 8;
	var offsetY = Math.random() * (Math.max(0, speed - 1)) * 8;
	ctx.globalAlpha = 1;
	ctx.save();
	ctx.translate(offsetX, offsetY);
	
	ctx.beginPath();
	ctx.arc(0, 0, barRadius, position, position + size);
	ctx.arc(0, 0, barRadius + barWidth, position + size, position, 1);
	ctx.fillStyle = "white";
	ctx.fill();
	ctx.beginPath();
	ctx.arc(Math.cos(position) * (barRadius + barWidth / 2), Math.sin(position) * (barRadius + barWidth / 2), barWidth / 2, 0, Math.PI * 2);
	ctx.fill();
	ctx.beginPath();
	ctx.arc(Math.cos(position + size) * (barRadius + barWidth / 2), Math.sin(position + size) * (barRadius + barWidth / 2), barWidth / 2, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
	for (var e of energies) {
		e.draw();
	}
	if (startTime > -1) {
		ctx.globalAlpha = Math.min(1, Math.max(0, (startTime - frameNo + 50) / 50));
		
	}
	ctx.drawImage(graphics.dynamo, -200, -300);
	ctx.drawImage(graphics.sipky, -110, 100);
	ctx.globalAlpha = 1;
		ctx.font = "30px Arial";
		ctx.textAlign = "center";
		ctx.fillStyle = "white";
	if (end) {
		
		ctx.fillText("You broke the bulb in " + score + " seconds", 0, -200);
		
	
		ctx.fillText("Best scores: ", 150, -150);
		ctx.textAlign = "left";
		for (var i = 0; i < scores.length; ++i) {
			var y = -120 + i * 30;
			var x = Math.cos(y / 150) * 150;
			ctx.fillText(scores[i] + " s", x, y);
		}
		ctx.textAlign = "center";
		ctx.fillText("Press R to restart", 0, 200);
	}
}

function update() {
	//requestAnimationFrame(update);
	//speed += 0.001;
	++frameNo;
	position += speed;
	for (var e of energies) {
		e.update();
	}
	for (var i = 0; i < energies.length; ++i) {
		if (energies[i].ded) {
			energies.splice(i, 1);
			--i;
		}
	}
	
	if (--nextEnergy <= 0 && startTime > -1 && !end) {
		var dir = Math.random() * Math.PI * 2;
		var x = Math.cos(dir) * width / 2;
		var y = Math.sin(dir) * height / 2;
		energies.push(new Energy(x, y));
		nextEnergy = energyFrequency;
	}
	if (speed > 1.8 && !muted) {
		sounds.wyaou.play();
	}
	if (speed === 2.28) {
		score = Math.floor((frameNo - startTime) / 6) / 10;
		speed = 0;
		gainNode.gain.value = 0;
		sounds.wyaou.pause();
		sounds.wyaou.currentTime = 0;
		end = true;
		$.ajax({
			url: orig + "submit.php?score=" + score,
			type: "GET",
			crossDomain: true,
			success: function(data){
				console.log(data);
				scores = JSON.parse(data);
			}
		})
	}
	
	
	draw();
}



//https://gist.github.com/addyosmani/5434533
var limitLoop = function (fn, fps) {
 
    // Use var then = Date.now(); if you
    // don't care about targetting < IE9
    var then = new Date().getTime();

    // custom fps, otherwise fallback to 60
    fps = fps || 60;
    var interval = 1000 / fps;
	
    return (function loop(time){
        requestAnimationFrame(loop);
 
        // again, Date.now() if it's available
        var now = new Date().getTime();
        var delta = now - then;
 
        if (delta > interval) {
            // Update time
            // now - (delta % interval) is an improvement over just 
            // using then = now, which can end up lowering overall fps
            then = now - (delta % interval);
 
            // call the fn
            fn();
        }
    }(0));
};

onload = main;