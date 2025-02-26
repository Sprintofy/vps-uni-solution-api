'use strict';
import httpStatusCodes from 'http-status-codes';
import apiResponse from '../appConfigs/utilities/apiResponse';
import IController from '../appConfigs/utilities/IController';
import MESSAGES from '../common/messages/messages';
import tradeProofsService from '../services/tradeProofs.service';
import readEmailService from '../services/emailRead.service';
import emailService from '../services/utilities/email.service';
const LOGGER = new (require('../appConfigs/utilities/logger').default)('roleController.ts');


const fetch_all_clients_proofs: IController = async (req: any, res: any) => {
    try {
        let result = await tradeProofsService.fetch_all_clients_proofs(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, result)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const fetch_pre_trades_by_client_id: IController = async (req: any, res: any) => {
    try {
         let results = await tradeProofsService.fetch_trades_details_by_client_id(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const fetch_all_clients_trades_logs: IController = async (req: any, res: any) => {
    try {
        let result = await tradeProofsService.fetch_all_clients_trades_logs(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, result)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const download_all_pdf: IController = async (req: any, res: any) => {
    try {
        const results = await tradeProofsService.download_all_pdf(req)
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const download_all_email: IController = async (req: any, res: any) => {
    try {
        const results = await tradeProofsService.download_all_email(req)
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const download_all_pdf_by_client: IController = async (req: any, res: any) => {
    try {
        let results = await tradeProofsService.download_all_pdf_by_client(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const download_all_email_by_client: IController = async (req: any, res: any) => {
    try {
        let results = await tradeProofsService.download_all_email_by_client(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const resend_email: IController = async (req: any, res: any) => {
    try {
        let results = await tradeProofsService.resend_email(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const resend_email_all: IController = async (req: any, res: any) => {
    try {
        let results = await tradeProofsService.resend_email_all(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const read_email: IController = async (req: any, res: any) => {
    try {
        let results = await readEmailService.read_email(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const read_email_client_wise: IController = async (req: any, res: any) => {
    try {
        let results = await readEmailService.read_email_client_wise(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}


const generateAuthUrlC: IController = async (req: any, res: any) => {
    try {
        const clientId = req.query.clientId as string;
        if (!clientId)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, "Client ID is required", null);

        const authUrl = await emailService.generateAuthUrl(clientId);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, authUrl)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}
//

const exchangeCodeForTokensC: IController = async (req: any, res: any) => {
    try {
        const { clientId, code } = req.query;
        if (!clientId || !code)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST,  "Missing clientId or code", null);
        const tokens = await emailService.exchangeCodeForTokens(code as string);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, tokens)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

//
// const read_email_m: IController = async (req: any, res: any) => {
//     try {
//         let results = await gmailDownloadService.read_email_m2(req);
//         // const jobId = uuidv4()
//
//         // const { organization_id } = req.query
//
//         // const job = await jobQueue.add('emailProcessing', {organization_id}, { jobId });
//         // apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, { message: 'Exporting all emails..', jobId: job.id })
//         apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
//
//     } catch (error: any) {
//         if (error instanceof Error) {
//             console.log("inside if in catch")
//             apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
//         } else {
//             console.log("inside else in catch")
//
//             apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
//         }
//     }
// }
//
// const getEmailDownloadProgress: IController = async (req: any, res: any) => {
//     try {
//
//         // const { jobId } = req.query
//
//         // const job = await jobQueue.getJob(jobId);
//         // if(job){
//         //     if(job?.progress === 100){
//         //         const url = await job.returnvalue;
//         //         apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH,{progress : job?.progress , downloadLink : url})
//
//         //     }
//         //     apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH,{progress : job?.progress , downloadLink : ' '})
//
//         // }else{
//             apiResponse.error(res, httpStatusCodes.BAD_REQUEST, "Failed to get progress", null);
//
//         // }
//     } catch (error: any) {
//         if (error instanceof Error) {
//             apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
//         } else {
//             apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
//         }
//     }
// }


export default {

    fetch_all_clients_proofs: fetch_all_clients_proofs,
    fetch_pre_trades_by_client_id: fetch_pre_trades_by_client_id,
    fetch_all_clients_trades_logs: fetch_all_clients_trades_logs,

    download_all_pdf: download_all_pdf,
    download_all_email:download_all_email,
    download_all_pdf_by_client: download_all_pdf_by_client,
    download_all_email_by_client:download_all_email_by_client,

    read_email: read_email,
    exchangeCodeForTokensC: exchangeCodeForTokensC,
    generateAuthUrlC: generateAuthUrlC,
    resend_email: resend_email,
    resend_email_all: resend_email_all,
    read_email_client_wise: read_email_client_wise

}
