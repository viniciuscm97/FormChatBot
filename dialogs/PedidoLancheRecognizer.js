const { LuisRecognizer } = require('botbuilder-ai');

class PedidoLancheRecognizer {
    
    constructor(config){
        const luisIsConfigured = config && config.applicationId && config.endpointKey && config.endpoint;
        if (luisIsConfigured) {

            const recognizerOptions = {
                apiVersion: 'v3'
            };

            this.recognizer = new LuisRecognizer(config, recognizerOptions);
        }
    }

    get isConfigured() {
        return (this.recognizer !== undefined)
    }

    async executeLuisQuery(context) {
        return await this.recognizer.recognize(context);
    }

    getUmUmaEntities(){
        let fromValue, fromAirportValue;
        if (result.entities.$instance.From) {
            fromValue = result.entities.$instance.From[0].text;
        }
        if (fromValue && result.entities.From[0].Airport) {
            fromAirportValue = result.entities.From[0].Airport[0][0];
        }

        return { from: fromValue, airport: fromAirportValue };
    }
}

module.exports.PedidoLancheRecognizer = PedidoLancheRecognizer;