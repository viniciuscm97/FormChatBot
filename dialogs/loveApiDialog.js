const {
    ChoiceFactory,     
    ChoicePrompt,
    ComponentDialog,
    TextPrompt,
    WaterfallDialog,
} = require('botbuilder-dialogs');

const fetch = require("node-fetch");

const CONFIRM_PROMPT_FINAL = 'CONFIRM_PROMPT_FINAL';
const FIRST_NAME_PROMPT = 'FIRST_NAME_PROMPT';
const SECOND_NAME_PROMPT = 'SECOND_NAME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';

class LoveApiDialog extends ComponentDialog{
    
    constructor(id) {
        super(id || 'loveApiDialog')

        this.addDialog(new TextPrompt(FIRST_NAME_PROMPT));
        this.addDialog(new TextPrompt(SECOND_NAME_PROMPT));
        this.addDialog(new ChoicePrompt(CONFIRM_PROMPT_FINAL));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.firstNameStep.bind(this),
            this.SecondNameStep.bind(this),
            this.confirmStep.bind(this),
            this.finalStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;

    }

    async firstNameStep(step){
        const apiDetails = step.options;

        if (!apiDetails.firstName) {
            // const promptOptions = { prompt: 'Por favor insira o primeiro nome: ', retryPrompt: 'Nome não foi encontrado na base de dados do IBGE. Digite novamente:' };
            return await step.prompt(FIRST_NAME_PROMPT, 'Por favor insira o primeiro nome: '); 
        }

        return await step.next(apiDetails.firstName);
    }

    async SecondNameStep(step){
        const apiDetails = step.options;

        step.values.firstName = step.result;
        
        if (!apiDetails.secondName) {
            // const promptOptions = { prompt: 'Por favor insira o segundo nome: ', retryPrompt: 'Nome não foi encontrado na base de dados do IBGE. Digite novamente:' };
            return await step.prompt(SECOND_NAME_PROMPT, 'Por favor insira o segundo nome: '); 
        }

        return await step.next(apiDetails.secondName);
        
    }

    async confirmStep(step) {
        step.values.secondName = step.result;
        
        return await step.prompt(CONFIRM_PROMPT_FINAL, {
            prompt: 'Confirma as informações enviadas: ',
            choices: ChoiceFactory.toChoices(['Sim', 'Não'])
            
        });
    }
    


    async finalStep(step) {
        if (step.result.value.toLowerCase() == 'sim') {
            const data = {};

            const dataApi =  await this.runApi(step.values.firstName,step.values.secondName);

            data.firstName = step.values.firstName;
            data.secondName = step.values.secondName;
            data.percentage = dataApi.percentage
            data.result = dataApi.result

            let msg = `O resultado de ${ data.firstName } e ${ data.secondName } para combitiblidade no amor é de: ${ data.percentage}%
             \n  ${data.result}`;
            msg += '.';

            await step.context.sendActivity(msg);
            return await step.endDialog( data);
        } 

        return await step.endDialog();
    }

    async runApi(first,second){
  
        let myHeaders = new fetch.Headers({
            "x-rapidapi-key": "eab655801dmsh640300e5ef6208cp159a46jsne85f2ecacb6c",
            "x-rapidapi-host": "love-calculator.p.rapidapi.com",
            "useQueryString": true
        });

        let options = {
            method:'GET',
            headers: myHeaders
        }

        let result = {} 
        await fetch(`https://love-calculator.p.rapidapi.com/getPercentage?fname=${first}&sname=${second}`,options)
        .then(res => res.json())
        .then(data => {
            result.percentage = data.percentage;
            result.result = data.result;
         })
         .catch(erro =>{
             throw new Error(erro)
         });

         return result;

    }

}

module.exports.LoveApiDialog = LoveApiDialog;