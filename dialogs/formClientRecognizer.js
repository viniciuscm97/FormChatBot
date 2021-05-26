const { LuisRecognizer } = require('botbuilder-ai');

class FormClientRecognizer {
    
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

    getGenderEntities(result){
        let sexoValue, gendersValue;
        
        if (result.entities.$instance.genders) {
            sexoValue = result.entities.$instance.genders[0].text;
        }
        if (sexoValue && result.entities.genders[0]) {
            gendersValue = result.entities.genders[0][0];
        }

        return { sexo: sexoValue, genders: gendersValue };
    }

    getApiEntities(result){
        // console.log(result)
        let firstName,secondName
        let namesValue=[];
        
        if (result.entities.$instance.nomes) {
            firstName = result.entities.$instance.nomes[0].text;
            secondName = result.entities.$instance.nomes[1].text;
        }
        if (firstName && secondName && result.entities.nomes[0] ) {
            namesValue.push(result.entities.nomes[0]);
            if(result.entities.nomes[1]) namesValue.push(result.entities.nomes[1]);
        }

        return { second: secondName,first: firstName, names: namesValue.join(',') };
    }
}

module.exports.FormClientRecognizer = FormClientRecognizer;