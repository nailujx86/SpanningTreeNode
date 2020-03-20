"use strict";

function Parser(config) {
    this.MAX_IDENT = config.MAX_IDENT || 16;
    this.MAX_ITEMS = config.MAX_ITEMS || 256;
    this.MAX_NODE_ID = config.MAX_NODE_ID || 128;
    this.MAX_KOSTEN = config.MAX_KOSTEN || 16;

    this.commentsFilter = /^(?!\/\/).*$/gm;
    this.nameMatcher = new RegExp("(?:Graph )(\\w{1," + this.MAX_IDENT + "})(?: {)", "");
    this.nodeMatcher = new RegExp("^\\t*\\s*(\\w{1," + this.MAX_IDENT + "})\\s*=\\s*(\\d+);$", "gm");
    this.linkMatcher = new RegExp("^\\t*\\s*(\\w{1," + this.MAX_IDENT + "})\\s*-\\s*(\\w{1," + this.MAX_IDENT + "})\\s+:\\s+(\\d+);$", "gm")

}

function Tree(config) {
    this.nodeList = [];
    this.rootNodeId = undefined;
    this.linkList = [];
    if(config) {
        this.name = config.name || "GRAPH";
    } else {
        this.name = "GRAPH";
    }
}

function Node(id, name) {
    this.id = id;
    this.name = name;
    this.msgCount = 0; // hops
    this.nextHop = undefined;
    this.rootCost = 0;
    this.rootID = id;
}

function Link(a, b, cost) {
    this.idA = a;
    this.idB = b;
    this.cost = cost || 0;
}

Link.prototype.findOtherID = function(id) {
    if(id === this.idA)
        return this.idB;
    if(id === this.idB)
        return this.idA;
    return null;
}

Tree.prototype.findLink = function(a, b) {
    for(var link of this.linkList) {
        if(link.idA === a && link.idB === b || link.idA === b && link.idB === a)
            return link;
    }
    throw new Error("Link ${a}<->${b} not found!");
}

Tree.prototype.findLinks = function(nodeid) {
    return this.linkList.filter(link => link.idA === nodeid || link.idB === nodeid);
}

Tree.prototype.addLink = function(link) {
    if(!(link instanceof Link)) {
        throw new TypeError("Parameter of Type 'Link' expected!");
    }
    try {
        this.findLink(link.idA, link.idB)
    } catch (error) {
        this.linkList.push(link);
    }  
}

Tree.prototype.generateMissingLinks = function() {
    for(var node1 of this.nodeList) {
        for(var node2 of this.nodeList) {
            if(node1 === node2)
                continue;
            if(!this.linkList.some(link => link.idA === node1.id && link.idB === node2.id || link.idA === node2.id && link.idB === node1.id))
                this.addLink(new Link(node1.id, node2.id, 0));
        }
    }
};

Tree.prototype.addNode = function(node) {
    if(!(node instanceof Node)) {
        throw new TypeError("Parameter of Type 'Node' expected!");
    }
    if(!this.nodeList.some(node1 => node1.id === node.id)) {
        this.nodeList.push(node);
        if(this.rootNodeId == undefined || node.id < this.rootNodeId)
            this.rootNodeId = node.id;
    }
}

Tree.prototype.getNode = function(nodeIdentificator) {
    for(var node of this.nodeList) {
        if(!isNaN(nodeIdentificator) && nodeIdentificator == node.id || node.name == nodeIdentificator)
            return node;
    }
    return null;
}

Node.prototype.receiveSuggestion = function(rootNodeSuggestionID, sourceID, rootCost) {
    this.msgCount++;
    if(rootNodeSuggestionID < this.rootID ) {
        //if(rootCost < this.rootCost || this.rootCost == 0) {
            
        //}
        this.rootCost = rootCost;
        this.nextHop = sourceID;
        this.rootID = rootNodeSuggestionID;
        return true;
    } else if(rootNodeSuggestionID == this.rootID && rootCost < this.rootCost) {
        this.rootCost = rootCost;
        this.nextHop = sourceID;
        return true;
    }
    return false;
}

Tree.prototype.runNodeCalc = function(node, recursive) {
    recursive = recursive || false;

    if(typeof node === 'number') {
        node = this.getNode(node);
        if(node === null) {
            throw new Error("No such node with this ID!");
        }
    }
    if(!(node instanceof Node)) {
        throw new TypeError("Parameter of Type 'Node' expected!");
    }
    var linkList = this.findLinks(node.id);
    for(var link of linkList) {
        if(link.cost == 0)
            continue;
        var otherNode = this.getNode(link.findOtherID(node.id));
        var acceptedSuggestion = otherNode.receiveSuggestion(node.rootID, node.id, node.rootCost + link.cost);
        console.debug("ID:" + otherNode.id + "; Received suggestion: " + node.rootID + "; Source: " + node.id + "; Cost: " + (node.rootCost + link.cost) + "; Accepted: " + acceptedSuggestion);
        if(acceptedSuggestion && recursive) {
            this.runNodeCalc(otherNode, recursive);
        }
    }
}

Tree.prototype.toString = function() {
    var string = "Spanning-Tree of " + this.name + " {\n\n";
    var lowest = undefined;
    for(var node of this.nodeList) {
        if(lowest == undefined || node.rootID < lowest) {
            lowest = node.rootID;
        }
    }
    string += "\tRoot: " + this.getNode(node.rootID).name + ";\n";
    for(var node of this.nodeList) {
        if(node.id == this.rootNodeId || isNaN(node.nextHop))
            continue;
        string += "\t" + node.name + " - " + this.getNode(node.nextHop).name + ";\n";
    }
    string += "}";
    return string;
}

Parser.prototype.parse = function(input) {
    var filtered = input.match(this.commentsFilter).join("\n");
    var name = filtered.match(this.nameMatcher)[1];
    var nodeList = Array.from(filtered.matchAll(this.nodeMatcher), m => {return {name: m[1], id: m[2]}});
    var linkList = Array.from(filtered.matchAll(this.linkMatcher), m => {return {idA: m[1], idB: m[2], cost: m[3]}});
    
    var tree = new Tree({name: name});
    for(var node of nodeList) {
        tree.addNode(new Node(Number(node.id), node.name));
    }

    for(var link of linkList) {
        tree.addLink(new Link(tree.getNode(link.idA).id, tree.getNode(link.idB).id, Number(link.cost)));
    }
    
    return tree;
}

Tree.prototype.simulate = function(minIterations, minhop, recursive) {
    var iterations = minIterations || 5;
    minhop = minhop || 0;
    recursive = recursive || false;    var simCount = 0;
    do {
        for(var i = 0; i < iterations; i++) {
            var randi = Math.floor(Math.random() * this.nodeList.length);
            simCount++;
            console.debug("Chosen Start-Node: " + this.nodeList[randi].id);
            this.runNodeCalc(this.nodeList[randi], recursive);
        }
    } while(this.nodeList.some(node => node.msgCount <= minhop) && minhop != 0);
    return simCount;
}