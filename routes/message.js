const router = require("express").Router();
const Message = require("../models/message");
const User = require("../models/user");
const authCheck = require("../middleware/index");

router.post("/create/:userId", authCheck, async (req, res, next) => {
    try {
        const message = new Message();
        message.content = req.body.content;
        message.sender = req.params.userId;
        message.recepient = req.body.recepientId;
        const recepient = await User.findById(message.recepient);
        const sender = await User.findById(message.sender);
        if (!recepient)
            return res.status(400).json({ success: false, message: "User not found" });

        const savedMsg = await message.save();

        sender.messagesSent.push(savedMsg._id);
        recepient.messagesReceived.push(savedMsg._id);
        const msgTosent = await Message.findById(savedMsg._id)
            .populate({ path: "sender", select: "name picture gender" })
            .populate({ path: "recepient", select: "name picture gender" })
        await sender.save();
        await recepient.save();

        return res.status(201).json({ success: true, message: msgTosent })
    } catch (err) {
        res.status(500).json({ success: false, error: err });
    }

})

//get messaged based on message id
router.get("/:id", authCheck, async (req, res, next) => {
    try {
        var msgId = req.params.id;
        const message = await Message.findById(msgId)
            .populate({ path: "sender", select: "name picture" })
            .populate({ path: "recepient", select: "name picture" })

        if (message) {
            return res.status(200).json({ success: true, message: message });
        }
        return res.status(404).json({ message: "Message not found", success: false });
    } catch (err) {
        res.status(500).json({ success: false, error: err });
    }
})

//get messages for user 
router.get("/user/:userId", authCheck, async (req, res, next) => {
    try {
        const msgContainer = req.query.messageContainer || "Unread";
        const pageNum = req.query.pageNum || 0;
        const pageSize = req.query.pageSize || 5;
        const userId = req.params.userId;
        const totalMsg = await Message.countDocuments();
        let messages = await Message.find()
            .populate({ path: "sender", select: "name picture gender" })
            .populate({ path: "recepient", select: "name picture gender" })
            .skip(pageNum * pageSize)
            .limit(pageNum)
            .sort({ dateSent: "-1" })

        switch (msgContainer) {
            case "Inbox":
                messages = messages.filter(m => m.recepient._id == userId && m.recepientDeleted==false);
                break;

            case "Outbox":
                messages = messages.filter(m => m.sender._id == userId && m.senderDeleted==false);
                break;

            default:
                messages = messages.filter(m => m.isRead == false && m.recepientDeleted==false && m.recepient._id == userId);

        }

        return res.status(200).json({ message: messages, total: totalMsg });


    } catch (err) {
        res.status(500).json({ success: false, error: err });

    }

})

//get conversation between two user

router.get("/user/:userId/:recepientId", authCheck, async (req, res, next) => {
    try {
        let userId = req.params.userId;
        let recepientId = req.params.recepientId;
        let messages = await Message.find()
            .populate({ path: "sender", select: "name picture gender" })
            .populate({ path: "recepient", select: "name picture gender" })
            .sort({ dateSent: "-1" })


        messages = messages.filter(m => {
            return m.recepient._id == userId && m.sender._id == recepientId
                || m.sender._id == userId && m.recepient._id == recepientId

        })

        return res.status(200).json(messages);

    } catch (err) {
        res.status(500).json({ success: false, error: err });

    }

})


router.post("/:userId/:id", authCheck, async (req, res, next) => {

    try {
        const userId = req.params.userId;
        const msgId = req.params.id;

        const message = await Message.findById(msgId)
        console.log(message);
                             
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        if (message.sender=== userId) {
            message.senderDeleted = true;
            await message.save();
        }

        if (message.recepient === userId) {
            message.recepientDeleted = true;
             await message.save();
        }

        if (message.senderDeleted && message.recepientDeleted) {
            message.remove();
            await message.save();
             return res.status(204);
        }

        return res.status(200).json({success:true});
    } catch (err) {
        res.status(500).json({ success: false, error: err });

    }

})

module.exports = router;