"use strict";

function Parser(config) {
    this.MAX_IDENT = config.MAX_IDENT || 16;
    this.MAX_ITEMS = config.MAX_ITEMS || 256;
    this.MAX_NODE_ID = config.MAX_NODE_ID || 128;
    this.MAX_KOSTEN = config.MAX_KOSTEN || 16;
}

function Tree(config) {
    this.nodeList = [];
    this.rootNodeId = undefined;
    this.linkList = [];
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

function Simulator(tree, options) {
    if(!(tree instanceof Tree))
        throw new TypeError("Parameter of Type 'Link' expected!");
    this.tree = tree;
    this.iterations = options.iterations || 10;
}

Link.prototype.findOtherID = function(id) {
    if(id === this.idA)
        return this.idB;
    if(id === this.idB)
        return this.idA;
    return null;
}

Tree.prototype.findLink = function(a, b) {
    for(link of this.linkList) {
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
    if(!this.nodeList.some(node1 => node1.id === node.id))
        this.nodeList.push(node);
}

Tree.prototype.getNode = function(nodeID) {
    for(node of this.nodeList) {
        if(node.id == nodeID)
            return node;
    }
    return null;
}

Node.prototype.receiveSuggestion = function(rootNodeSuggestionID, rootCost) {
    if(rootNodeSuggestionID < this.rootID) {
        this.rootID = rootNodeSuggestionID;
        this.rootCost += rootCost;
        return true;
    }
    return false;
}

Tree.prototype.runNodeCalc = function(node) {
    if(node instanceof Number) {
        node = this.getNode(node);
            throw new Error("No such node with this ID!");
        }
    }
    if(!(node instanceof Node)) {
        throw new TypeError("Parameter of Type 'Node' expected!");
    }
    var linkList = node.findLinks(node.id);
    for(link of linkList) {
        var otherNode = this.getNode(link.findOtherID(node.id));
        var acceptedSuggestion = otherNode.receiveSuggestion(node.id, link.cost);

    }
}