<?php
namespace SpawnKill;

/**
 * Permet d'exécuter facilement des requêtes HTTP parallèles
 */
class MultiCurlManager {

    /**
     * curl multi handle
     */
    protected $multiHandle;

    /**
     * array<CURLOPT => ?> Options de curl
     */
    protected $options = array();

    /**
     * array<String> Ressources à récupérer
     */
    protected $urls = array();

    protected $handles = array();

    public function __construct() {
        $this->multiHandle = curl_multi_init();
    }

    /**
     * Ajoute une url à appeler
     */
    public function addUrl($url) {
        $this->urls[] = $url;
    }

    /**
     * Remplace les urls à appeler
     * @param array<String> $urls $urls à appeler
     */
    public function setUrls($urls) {
        $this->urls = $urls;
    }

    /**
     * Ajoute une option
     */
    public function addOption($option) {
        $this->options[] = $option;
    }

    /**
     * Remplace les urls à appeler
     * @param array<array<CURLOPT => ?>> $options Options à
     */
    public function setOptions($options) {
        $this->options = $options;
    }

    /**
     * Ajoute un curl handle pour l'url passée en paramètre
     * avec les options de l'objet au multi handle
     */
    private function addHandle($url) {

        $handle = curl_init($url);

        $this->applyOptions($handle);

        curl_multi_add_handle($this->multiHandle, $handle);

        $this->handles[] = $handle;
    }

    /**
     * Supprime tous les curl handle
     */
    private function clearHandles() {
        $this->handles = array();
    }

    /**
     * Applique les options courantes à l'handle passé en paramètre.
     */
    protected function applyOptions($handle) {

        foreach($this->options as $curlopt => $value) {
            curl_setopt($handle, $curlopt, $value);
        }
    }

    /**
     * Exécute les requêtes vers $this->urls et retourne un tableau des données récupérées
     * @return array Résultat de la requête, du type :
     *      Object(
     *          "httpCode": (int),
     *          "data": (string)
     *      )
     */
    public function processRequests() {

        $this->clearHandles();

        foreach ($this->urls as $url) {
            $this->addHandle($url);
        }

        $running = null;

        do {
            do {
                $curlm = curl_multi_exec($this->multiHandle, $running);
                usleep(2000);
            } while ($curlm == CURLM_CALL_MULTI_PERFORM);
            usleep(2000);
        } while($running > 0);

        $data = array();

        foreach($this->handles as $handle) {

            $requestData = new \stdClass();
            $requestData->httpCode = curl_getinfo($handle, CURLINFO_HTTP_CODE);
            $requestData->data = curl_multi_getcontent($handle);

            //Si data est vide (timeout), on ajoute l'erreur manuellement
            if(empty($requestData->data)) {
                $requestData->httpCode = 408;
            }

            $data[] = $requestData;

            curl_multi_remove_handle($this->multiHandle, $handle);
        }


        return $data;

    }
}