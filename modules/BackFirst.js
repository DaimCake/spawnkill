"use strict";
/* jshint multistr: true */
/* jshint newcap: false */

/**
 * BackFirst : Ce module permet de revenir � la premi�re page de la liste des sujets
 * lorsque l'on se trouve sur un topic.
 */
SK.moduleConstructors.BackFirst = SK.Module.new();

SK.moduleConstructors.BackFirst.prototype.id = "BackFirst";
SK.moduleConstructors.BackFirst.prototype.title = "Retour premi�re page";
SK.moduleConstructors.BackFirst.prototype.description = "Permet de revenir � la premi�re page de la liste des sujets lorsque l'on se trouve sur un topic.";

//Si le module est requis (impossible de le d�sactiver), d�commenter cette ligne
// SK.moduleConstructors.BackFirst.prototype.required = true;

/**
 * Initialise le module, fonction appel�e quand le module est charg�
 */
SK.moduleConstructors.BackFirst.prototype.init = function() {
    //Code ex�cut� au chargement du module
    this.addBackFirstLinks();
};

/**
 * Modifie le lien de retour � la liste des sujets pour qu'il renvoie vers la premi�re page
 */
SK.moduleConstructors.BackFirst.prototype.addBackFirstLinks = function() {

    //On parcourt les boutons de retour � la liste des sujets
    $(".liste > a").each(function() {

        var $link = $(this);
    
        var url = $link.attr("href");
    
        var newUrl = url.replace(/forums\/26-(\d+)-\d+-/, "forums/26-$1-0-");
    
        $link.attr("href", newUrl);
    
    });
};


/**
 * Le script est ex�cut� sur les pages de lecture et de r�ponse � un topic.
 */
SK.moduleConstructors.BackFirst.prototype.shouldBeActivated = function() {
    return SK.Util.currentPageIn([ "topic-read", "topic-response" ]);
};
