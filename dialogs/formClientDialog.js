const {
    ChoiceFactory,     
    ChoicePrompt,
    ComponentDialog,
    ConfirmPrompt,
    DialogSet,
    DialogTurnStatus,
    NumberPrompt,
    TextPrompt,
    WaterfallDialog,
    DateTimePrompt
} = require('botbuilder-dialogs');


const { ClientProfile } = require('../class/ClientProfile');
const fetch = require("node-fetch");


const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
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
    
    constructor(userState) {
        super('formClientDialog')
        
        this.clientProfile = userState.createProperty(USER_PROFILE);

        this.addDialog(new TextPrompt(NAME_PROMPT, this.namePromptValidator));
        this.addDialog(new NumberPrompt(AGE_PROMPT, this.agePromptValidator));
        this.addDialog(new TextPrompt(CPF_PROMPT, this.cpfPropmtValidator));
        this.addDialog(new TextPrompt(CEP_PROMPT, this.cepPromptValidator));
        this.addDialog(new DateTimePrompt(BIRTH_PROMPT, this.birthPrompValidator));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
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

    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async nameStep(step){
        const promptOptions = { prompt: 'Por favor insira seu nome: ', retryPrompt: 'Nome não foi encontrado na base de dados do IBGE. Digite novamente:' };
        
        return await step.prompt(NAME_PROMPT, promptOptions); 
    }
    


    async ageStep(step){

        step.values.name = step.result        
        const promptOptions = { prompt: 'Por favor digite a sua idade: ', retryPrompt: 'A idade deve ser entre 0 e 150 anos. Digite novamente:' };
        return await step.prompt(AGE_PROMPT,promptOptions);
        
    }

    async genderStep(step) {
        step.values.age = step.result;
        return await step.prompt(CHOICE_PROMPT,
            {
                prompt: 'Escolha seu gênero: ',
                choices: ChoiceFactory.toChoices(['Homem', 'Mulher', 'Outro'])
        });
    }
    async cpfStep(step) {

        step.values.gender = step.result.value;
        const promptOptions = { prompt: `Por favor insira seu CPF:\n EX: 02569011616 ou 025.690.116/16`, retryPrompt: 'O CPF esta incorreto. Digite novamente:' };
        return await step.prompt(CPF_PROMPT, promptOptions);
    }

    async cepStep(step) {

        step.values.cpf = step.result.toString().replace(/\D/g, '');
        const promptOptions = { prompt: `Por favor insira seu CEP (somente números): \n EX: 9212050`, retryPrompt: 'O CEP esta incorreto. Por favor digite novamente:' };
        return await step.prompt(CEP_PROMPT, promptOptions);
    }

    async birthdayStep(step) {
        
        step.values.cep = step.result;
        const promptOptions = { prompt: `Insira sua data de nascimento (DD/MM):\n EX: 31/12`, retryPrompt: 'A data esta incorreta. Por favor digite novamente:' };
        return await step.prompt(BIRTH_PROMPT, promptOptions);
    }

    async confirmStep(step) {
        step.values.birth = step.result;
        
        return await step.prompt(CONFIRM_PROMPT, {
            prompt: 'Confirma as informações enviadas: ',
            choices: ChoiceFactory.toChoices(['Sim', 'Não'])
            
        });
    }
    
    async namePromptValidator (promptContext) {
        
        const nome = promptContext.recognized.value;
        let nomeValido = true;
        
        await fetch(`https://servicodados.ibge.gov.br/api/v2/censos/nomes/${nome}`)
        .then(res => res.json())
        .then(data => { if(!data[0])  nomeValido = false; });
        
        
        if (!nomeValido) {
            
            return false;
        }
        
        return nomeValido;
    }
    
    async cpfPropmtValidator (promptContext) {
        const cpfSomenteNumeros = promptContext.recognized.value.toString().replace(/\D/g, '');

        if (!(cpfSomenteNumeros.length == 11)){
            console.log(promptContext)
            promptContext.options[0].retryPrompt = 'O CPF deve ter 11 digitos!';            
            return false;
        } 
        
        const cpfArray = cpfSomenteNumeros.split(""); 
        
        // validar J
        let soma = 0;
        let posicao = 9;
        let numValidadorJ = cpfArray[posicao];
        let numMultiplica = 10;
        
        for (let i = 0; i <= (posicao-1); i++) {
            soma += cpfArray[i] * numMultiplica;
            numMultiplica--;
        }
        
        let restoJ = soma % 11;
        
        // valida K
        soma = 0;
        posicao = 10;
        let numValidadorK = cpfArray[posicao];
        numMultiplica = 11;

        for (let i = 0; i <= (posicao-1); i++) {
            soma += cpfArray[i] * numMultiplica;
            numMultiplica--;
        }

        let restoK = soma % 11;
        
        if((restoJ == 0 || restoJ == 1) || (restoK == 0 || restoK == 1)){
            
            return numValidadorJ == 0 || numValidadorK == 0;
        } else if ( (restoJ >= 2 || restoJ <= 10) || (restoK >= 2 || restoK <= 10) ){
            
            return numValidadorJ == (11 - restoJ) || numValidadorK == (11 - restoK);
        }else {

            return false;
        }
        
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

        if (step.result) {
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

            let msg = `Seu nome é ${ clientProfile.name }, você nasceu no dia ${ clientProfile.birth.getDate() } do ${ clientProfile.birth.getMonth() +1} de ${ clientProfile.birth.getFullYear() },
             e seu gênero é ${ clientProfile.gender }.
            Seu CPF é ${ cpfFormatted }, e você reside na cidade ${clientProfile.city} - ${clientProfile.state}.
            \n Seja bem-vindo! 😊`;
            msg += '.';

            await step.context.sendActivity(msg);

        } else {
            await step.context.sendActivity('Obrigado. Suas informações não serão salvas!');
        }

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is the end.
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




}

module.exports.FormClientDialog = FormClientDialog;