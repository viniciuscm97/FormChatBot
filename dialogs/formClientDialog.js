const {
    ChoiceFactory,     
    ChoicePrompt,
    ComponentDialog,
    NumberPrompt,
    TextPrompt,
    WaterfallDialog,
    DateTimePrompt
} = require('botbuilder-dialogs');


const { ClientProfile } = require('../class/ClientProfile');
const fetch = require("node-fetch");


const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT_FINAL = 'CONFIRM_PROMPT_FINAL';
const NAME_PROMPT = 'NAME_PROMPT';
const AGE_PROMPT = 'AGE_PROMPT';
const CPF_PROMPT = 'CPF_PROMPT';
const CEP_PROMPT = 'CEP_PROMPT';
const BIRTH_PROMPT = 'BIRTH_PROMPT';
const USER_PROFILE = 'USER_PROFILE';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
var clientState = '';
var clientCity = '';
var birthday = {day: '', month: ''};

class FormClientDialog extends ComponentDialog{
    
    constructor(id,userState) {
        super(id || 'formClientDialog')
        
        this.clientProfile = userState.createProperty(USER_PROFILE);
        

        this.addDialog(new TextPrompt(NAME_PROMPT, this.namePromptValidator));
        this.addDialog(new NumberPrompt(AGE_PROMPT, this.agePromptValidator));
        this.addDialog(new TextPrompt(CPF_PROMPT, this.cpfPropmtValidator));
        this.addDialog(new TextPrompt(CEP_PROMPT, this.cepPromptValidator));
        this.addDialog(new DateTimePrompt(BIRTH_PROMPT, this.birthPrompValidator));
        this.addDialog(new ChoicePrompt(CONFIRM_PROMPT_FINAL));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.nameStep.bind(this),
            this.ageStep.bind(this),
            this.genderStep.bind(this),
            this.cpfStep.bind(this),
            this.cepStep.bind(this),
            this.birthdayStep.bind(this),
            this.confirmStep.bind(this),
            this.finalStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;

    }

    async nameStep(step){
        const formDetails = step.options;
        console.log(formDetails)
        if (!formDetails.name) {
            const promptOptions = { prompt: 'Por favor insira seu nome: ', retryPrompt: 'Nome n??o foi encontrado na base de dados do IBGE. Digite novamente:' };
            return await step.prompt(NAME_PROMPT, promptOptions); 
        }

        if (!this.validaNome(formDetails.name)) {
            const promptOptions = { prompt: 'Nome informado n??o foi encontrado na base de dados do IBGE. Digite novamente: ', retryPrompt: 'Nome n??o foi encontrado na base de dados do IBGE. Digite novamente:' };
            return await step.prompt(NAME_PROMPT, promptOptions); 
        }

        return await step.next(formDetails.name)

    }

    async ageStep(step){
        step.values.name = step.result;

        const formDetails = step.options;
        
        if (!formDetails.age) {
            step.values.name = await this.firstToUperCase(step.result);        
            const promptOptions = { prompt: 'Por favor digite a sua idade: ', retryPrompt: 'A idade deve ser entre 0 e 150 anos. Digite novamente:' };
            return await step.prompt(AGE_PROMPT,promptOptions);
        }
        return await step.next(formDetails.age)
        
    }

    async firstToUperCase(name){
        const nameArray = name.toLowerCase().split("");
        nameArray[0] = nameArray[0].toUpperCase()
        return nameArray.join('')
    }

    async genderStep(step) {
        step.values.age = step.result;

        const formDetails = step.options;

        if (!formDetails.gender) {
            return await step.prompt(CHOICE_PROMPT,
                {
                    prompt: 'Escolha seu g??nero: ',
                    choices: ChoiceFactory.toChoices(['Homem', 'Mulher', 'Outro'])
            });
        }

        return await step.next(formDetails.gender);
    }
    async cpfStep(step) {
        step.values.gender = step.result.value ? step.result.value : step.result;

        const promptOptions = { prompt: `Por favor insira seu CPF:\n EX: 02569011616 ou 025.690.116/16`, retryPrompt: 'O CPF esta incorreto. Digite novamente:' };
        return await step.prompt(CPF_PROMPT, promptOptions);
    }

    async cepStep(step) {

        step.values.cpf = step.result.toString().replace(/\D/g, '');
        const promptOptions = { prompt: `Por favor insira seu CEP (somente n??meros): \n EX: 9212050`, retryPrompt: 'O CEP esta incorreto. Por favor digite novamente:' };
        return await step.prompt(CEP_PROMPT, promptOptions);
    }

    async birthdayStep(step) {
        
        step.values.cep = step.result;
        const promptOptions = { prompt: `Insira sua data de nascimento (DD/MM):\n EX: 31/12`, retryPrompt: 'A data esta incorreta. Por favor digite novamente:' };
        return await step.prompt(BIRTH_PROMPT, promptOptions);
    }

    async confirmStep(step) {
        step.values.birth = step.result;
        
        return await step.prompt(CONFIRM_PROMPT_FINAL, {
            prompt: 'Confirma as informa????es enviadas: ',
            choices: ChoiceFactory.toChoices(['Sim', 'N??o'])
            
        });
    }
    
    async namePromptValidator (promptContext) {
        const nome = promptContext.recognized.value;

        return this.validaNome(nome);
    }
    async validaNome(nome){

        await fetch(`https://servicodados.ibge.gov.br/api/v2/censos/nomes/${nome}`)
        .then(res => res.json())
        .then(data => { if(!data[0])  return false; });

        return true;
    }
    
    async cpfPropmtValidator (promptContext) {
        const cpfSomenteNumeros = promptContext.recognized.value.toString().replace(/\D/g, '');

        if (!(cpfSomenteNumeros.length == 11)){
            promptContext.options[0].retryPrompt = 'O CPF deve ter 11 digitos!';            
            return false;
        } 

        return FormClientDialog.prototype.validaDigitosCPF(cpfSomenteNumeros);
    }
    
    async agePromptValidator (promptContext) {
        return promptContext.recognized.succeeded && promptContext.recognized.value > 0 && promptContext.recognized.value < 150;
    }
    async birthPrompValidator (promptContext) {

        if(!promptContext.recognized.value) return false;

        const data = /^(\D{4})[-](\d{2})[-](\d{2})$/.exec(promptContext.recognized.value[0].timex);        
        if (data) {

            const mes = data[2];
            const dia = data[3];
            birthday.day = dia;
            birthday.month = mes;
            return true;        
        } else {
            
            return false;
        }
            
        
    }
    
    async cepPromptValidator (promptContext) {

        const cepSomenteNumeros = promptContext.recognized.value.toString().replace(/\D/g, '');
        
        if(!(/^[0-9]{8}$/.test(cepSomenteNumeros)))  return false;

        var cepValidoNaBase = false;

        await fetch(`https://viacep.com.br/ws/${cepSomenteNumeros}/json/`)
        .then(res => res.json())
        .then(data => {
            if(!data.erro){
                clientState = data.uf;
                clientCity = data.localidade;
                cepValidoNaBase = true;
            }
        }).catch( err => console.log(err))

        return cepValidoNaBase
    }
    async finalStep(step) {

        if (step.result.value.toLowerCase() == 'sim') {
            const clientProfile = await this.clientProfile.get(step.context, new ClientProfile());

            let anoNascimento = this.calculaIdade(step.values.age);

            clientProfile.name = step.values.name;
            clientProfile.age = step.values.age;
            clientProfile.gender = step.values.gender;
            clientProfile.cpf = step.values.cpf;
            clientProfile.cep = step.values.cep;
            clientProfile.birth = new Date(anoNascimento,birthday.month -1,birthday.day);
            clientProfile.city = clientCity;
            clientProfile.state = clientState;
            
            let cpfFormatted = clientProfile.cpf.toString().replace(/(\d{3})?(\d{3})?(\d{3})?(\d{2})/, "$1.$2.$3-$4");

            let msg = `Seu nome ?? ${ clientProfile.name }, voc?? nasceu no dia ${ clientProfile.birth.getDate() } do ${ clientProfile.birth.getMonth() +1} de ${ clientProfile.birth.getFullYear() },
             e seu g??nero ?? ${ clientProfile.gender }.
            Seu CPF ?? ${ cpfFormatted }, e voc?? reside na cidade ${clientProfile.city} - ${clientProfile.state}`;
            msg += '.';

            await step.context.sendActivity(msg);
  
            return await step.endDialog( clientProfile);
        } 
        return await step.endDialog();
    }

    calculaIdade(age){
        let dataDeHoje = new Date();
        
        let ano = dataDeHoje.getFullYear() - age;

        if( (dataDeHoje.getMonth()+1) < birthday.month || (dataDeHoje.getDate() < birthday.day && (dataDeHoje.getMonth()+1) == birthday.month)  ){
            ano--;
        }

        return ano;
    }

    calculaRestoDigitoCPF(cpf, posicao, numMultiplica){
        let soma = 0;
        
        for (let i = 0; i <= (posicao-1); i++) {
            soma += cpf[i] * numMultiplica;
            numMultiplica--;
        }

        return soma % 11;        
    }

    validaDigitosCPF(cpf){
        const cpfArray = cpf.split("");

        let numValidadorJ = cpfArray[9];
        let numValidadorK = cpfArray[10];
        
        let restoJ = FormClientDialog.prototype.calculaRestoDigitoCPF(cpfArray,9,10);
        let restoK = FormClientDialog.prototype.calculaRestoDigitoCPF(cpfArray,10,11);

        if((restoJ == 0 || restoJ == 1) || (restoK == 0 || restoK == 1)){
            
            return numValidadorJ == 0 || numValidadorK == 0;
        } else if ( (restoJ >= 2 || restoJ <= 10) || (restoK >= 2 || restoK <= 10) ){
            
            return numValidadorJ == (11 - restoJ) || numValidadorK == (11 - restoK);
        }else {

            return false;
        }
    }


}

module.exports.FormClientDialog = FormClientDialog;