import cron from "node-cron";
import tradeProofsModel from "../models/tradeProofs.model";
import emailReadService from "./emailRead.service";
import tradeProofService from "./tradeProofs.service";
import moment from "moment/moment";

cron.schedule("*/2 * * * *", async () => {
    try {
        let date = moment().format('YYYY-MM-DD');// Get today's date
        console.log("⏳ Running scheduled email job date :", date);
        const results = await tradeProofsModel.fetch_all_trade_proof_email_not_received(1,date);
        if(!results.length) {
            console.log("✅ All Emails Read successfully");
            return true;
        }
        console.log("✅ Open Emails Read Total Client",results.length);

        results.forEach((client: any) => {
            emailReadService.read_email_client_scheduler({results:[client]});
        });
        console.log("✅ Emails Read scheduler Execute successfully");
        return true;
    } catch (error) {
        console.error("❌ Error Emails Read scheduler:", error);
        return true;
    }
});

cron.schedule("*/2 * * * *", async () => {
    try {
        let date = moment().format('YYYY-MM-DD');//
        console.log("⏳ Running scheduled email resend job date :", date);
        tradeProofService.resend_email_all({query:{organization_id:1}});
        console.log("✅ All Emails Resend scheduler Execute successfully");
        return true;
    } catch (error) {
        console.error("❌ Error Emails Resend scheduler:", error);
        return true;
    }
});
