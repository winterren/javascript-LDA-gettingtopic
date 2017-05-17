
 //制造一个x长度的一维数组
function makeArray(x) {
	var a = new Array();	
	for (var i=0;i<x;i++)  {
		a[i]=0;
	}
	return a;
}


//制造一个x*y的二维数组
function make2DArray(x,y) {
	var a = new Array();	
	for (var i=0;i<x;i++)  {
		a[i]=new Array();
		for (var j=0;j<y;j++)
			a[i][j]=0;
	}
	return a;
}

// 对象
var lda = new function() {
	var documents,z,nw,nd,nwsum,ndsum,thetasum,phisum,V,K,alpha,beta; 
    var THIN_INTERVAL = 20;
    var BURN_IN = 100;
    var ITERATIONS = 1000;
    var SAMPLE_LAG;
    var dispcol = 0;
	var numstats=0;
    // 1 
	this.configure = function (docs,v,iterations,burnIn,thinInterval,sampleLag) {
        this.ITERATIONS = iterations;//10000
        this.BURN_IN = burnIn;//2000
        this.THIN_INTERVAL = thinInterval;//100
        this.SAMPLE_LAG = sampleLag;//10
		this.documents = docs;//整篇文章的词序表documents数组
		this.V = v;////V中记录一共有多少词
		this.dispcol=0;
		this.numstats=0; 
    }
    // 3
	this.initialState = function (K) {
        var i;
        var M = this.documents.length;
        this.nw = make2DArray(this.V,K); //V中记录一共有多少词，K记录用户需要多少个主题 V*K矩阵
        this.nd = make2DArray(M,K);  //M记录一共有多少句，K记录用户需要多少个主题 M*K矩阵
        this.nwsum = makeArray(K); //K记录用户需要多少个主题 -K数组
        this.ndsum = makeArray(M); //M记录一共有多少句 -M数组
        this.z = new Array();	
        for (i=0;i<M;i++) this.z[i]=new Array(); //二位z数组，行数=句子数
        // 遍历每个句子
        for (var m = 0; m < M; m++) {
            // N记录每个句子多少词
            var N = this.documents[m].length;
            this.z[m] = new Array();
            for (var n = 0; n < N; n++) {
                //重点~
                var topic = parseInt(""+(Math.random() * K));                 
                this.z[m][n] = topic;
                //z[m][n]=随机权重*所需主题数量
                this.nw[this.documents[m][n]][topic]++;
                this.nd[m][topic]++;
                this.nwsum[topic]++;
            }
            this.ndsum[m] = N;
        }
    }
	// 2
	this.gibbs = function (K,alpha,beta) {
		var i;
        this.K = K;//K记录用户需要多少个主题
        this.alpha = alpha;//每一个文档的主题概率分布
        this.beta = beta;// 每一个主题中词的概率分布
        if (this.SAMPLE_LAG > 0) {//sample_lag=10，所以以下执行
            this.thetasum = make2DArray(this.documents.length,this.K);//thetasum 中创建矩阵，句子数量*需要主题数量
            this.phisum = make2DArray(this.K,this.V);//phisum 中创建矩阵， 需要主题数量*词数量
            this.numstats = 0;
        }
        this.initialState(K);//->3
        //document.write("Sampling " + this.ITERATIONS
         //   + " iterations with burn-in of " + this.BURN_IN + " (B/S="
         //   + this.THIN_INTERVAL + ").<br/>");

         // 4
        for (i = 0; i < this.ITERATIONS; i++) {
            //句子数
			for (var m = 0; m < this.z.length; m++) {
                // 每句词数
                for (var n = 0; n < this.z[m].length; n++) {
			        var topic = this.sampleFullConditional(m, n); //跳到5
					this.z[m][n] = topic;
                }
            }
            if ((i < this.BURN_IN) && (i % this.THIN_INTERVAL == 0)) {
				//document.write("B");
                this.dispcol++;
            }
            if ((i > this.BURN_IN) && (i % this.THIN_INTERVAL == 0)) {
                //document.write("S");
                this.dispcol++;
            }
            if ((i > this.BURN_IN) && (this.SAMPLE_LAG > 0) && (i % this.SAMPLE_LAG == 0)) {
                this.updateParams();
				//document.write("|");                
                if (i % this.THIN_INTERVAL != 0)
                    this.dispcol++;
            }
            if (this.dispcol >= 100) {
				//document.write("*<br/>");                
                this.dispcol = 0;
            }
        }
    }
	
	//5
	this.sampleFullConditional = function(m,n) {
        var topic = this.z[m][n];
        this.nw[this.documents[m][n]][topic]--;
        this.nd[m][topic]--;
        this.nwsum[topic]--;
        this.ndsum[m]--;
        var p = makeArray(this.K);//k所需主题数
        for (var k = 0; k < this.K; k++) {
            p[k] = (this.nw[this.documents[m][n]][k] + this.beta) / (this.nwsum[k] + this.V * this.beta)
                * (this.nd[m][k] + this.alpha) / (this.ndsum[m] + this.K * this.alpha);
        }
        for (var k = 1; k < p.length; k++) {
            p[k] += p[k - 1];
        }
        var u = Math.random() * p[this.K - 1];
        for (topic = 0; topic < p.length; topic++) {
            if (u < p[topic])
                break;
        }
        this.nw[this.documents[m][n]][topic]++;
        this.nd[m][topic]++;
        this.nwsum[topic]++;
        this.ndsum[m]++;
        return topic;
    }
	
	this.updateParams =function () {
        for (var m = 0; m < this.documents.length; m++) {
            for (var k = 0; k < this.K; k++) {
                this.thetasum[m][k] += (this.nd[m][k] + this.alpha) / (this.ndsum[m] + this.K * this.alpha);
            }
        }
        for (var k = 0; k < this.K; k++) {
            for (var w = 0; w < this.V; w++) {
                this.phisum[k][w] += (this.nw[w][k] + this.beta) / (this.nwsum[k] + this.V * this.beta);
            }
        }
        this.numstats++;
    }
	

    // 输出
	this.getTheta = function() {
        var theta = new Array(); for(var i=0;i<this.documents.length;i++) theta[i] = new Array();
        if (this.SAMPLE_LAG > 0) {
            for (var m = 0; m < this.documents.length; m++) {
                for (var k = 0; k < this.K; k++) {
                    theta[m][k] = this.thetasum[m][k] / this.numstats;
                }
            }
        } else {
            for (var m = 0; m < this.documents.length; m++) {
                for (var k = 0; k < this.K; k++) {
                    theta[m][k] = (this.nd[m][k] + this.alpha) / (this.ndsum[m] + this.K * this.alpha);
                }
            }
        }
        return theta;
    }
	
    // 输出
	this.getPhi = function () {
        var phi = new Array(); for(var i=0;i<this.K;i++) phi[i] = new Array();
        if (this.SAMPLE_LAG > 0) {
            for (var k = 0; k < this.K; k++) {
                for (var w = 0; w < this.V; w++) {
                    phi[k][w] = this.phisum[k][w] / this.numstats;
                }
            }
        } else {
            for (var k = 0; k < this.K; k++) {
                for (var w = 0; w < this.V; w++) {
                    phi[k][w] = (this.nw[w][k] + this.beta) / (this.nwsum[k] + this.V * this.beta);
                }
            }
        }
        return phi;
    }

}