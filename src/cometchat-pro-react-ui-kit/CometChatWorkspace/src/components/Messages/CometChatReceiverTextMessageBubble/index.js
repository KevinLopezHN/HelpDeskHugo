import React from "react";
/** @jsxRuntime classic */
/** @jsx jsx */
import { jsx } from "@emotion/core";
import twemoji from "twemoji";
import ReactHtmlParser from "react-html-parser";
import PropTypes from "prop-types";
import { CometChat } from "@cometchat-pro/chat";

import { CometChatMessageActions, CometChatThreadedMessageReplyCount, CometChatReadReceipt, CometChatLinkPreview} from "../";
import { CometChatMessageReactions } from "../Extensions";
import { CometChatAvatar } from "../../Shared";

import { CometChatContext } from "../../../util/CometChatContext";
import { linkify, checkMessageForExtensionsData } from "../../../util/common";
import * as enums from "../../../util/enums.js";

import Translator from "../../../resources/localization/translator";
import { theme } from "../../../resources/theme";

import {
	messageContainerStyle,
	messageWrapperStyle,
	messageThumbnailStyle,
	messageDetailStyle,
	nameWrapperStyle,
	nameStyle,
	messageTxtContainerStyle,
	messageTxtWrapperStyle,
	messageTxtStyle,
	messageInfoWrapperStyle,
	messageReactionsWrapperStyle
} from "./style";

class CometChatReceiverTextMessageBubble extends React.Component {
	static contextType = CometChatContext;
	messageFrom = "receiver";

	constructor(props) {
		super(props);

		const message = Object.assign({}, props.message, {messageFrom: this.messageFrom});
		this.state = {
			message: message,
			translatedMessage: "",
			isHovering: false,
			enableLargerSizeEmojis: false,
		};
	}

	componentDidMount() {
		this.enableLargerSizeEmojis();
	}

	componentDidUpdate(prevProps) {
		const previousMessageStr = JSON.stringify(prevProps.message);
		const currentMessageStr = JSON.stringify(this.props.message);

		if (previousMessageStr !== currentMessageStr) {
			const message = Object.assign({}, this.props.message, {messageFrom: this.messageFrom});
			this.setState({message: message, translatedMessage: ""});
		}

		this.enableLargerSizeEmojis();
	}

	getMessageText = () => {
		let messageText = this.state.message.text;

		//xss extensions data
		const xssData = checkMessageForExtensionsData(this.state.message, "xss-filter");
		if (xssData && xssData.hasOwnProperty("sanitized_text") && xssData.hasOwnProperty("hasXSS") && xssData.hasXSS === "yes") {
			messageText = xssData.sanitized_text;
		}

		//datamasking extensions data
		const maskedData = checkMessageForExtensionsData(this.state.message, "data-masking");
		if (maskedData && maskedData.hasOwnProperty("data") && maskedData.data.hasOwnProperty("sensitive_data") && maskedData.data.hasOwnProperty("message_masked") && maskedData.data.sensitive_data === "yes") {
			messageText = maskedData.data.message_masked;
		}

		//profanity extensions data
		const profaneData = checkMessageForExtensionsData(this.state.message, "profanity-filter");
		if (profaneData && profaneData.hasOwnProperty("profanity") && profaneData.hasOwnProperty("message_clean") && profaneData.profanity === "yes") {
			messageText = profaneData.message_clean;
		}

		const formattedText = linkify(messageText);

		const emojiParsedMessage = twemoji.parse(formattedText, {folder: "svg", ext: ".svg"});
		const parsedMessage = ReactHtmlParser(emojiParsedMessage, {decodeEntities: false});
		const emojiMessage = parsedMessage.filter(message => message instanceof Object && message.type === "img");

		let showVariation = true;
		//if larger size emojis feature is disabled
		if (this.state.enableLargerSizeEmojis === false) {
			showVariation = false;
		}

		messageText = (
			<div css={messageTxtWrapperStyle(this.props)} className="message__txt__wrapper">
				<p css={messageTxtStyle(parsedMessage, emojiMessage, showVariation)} className="message__txt">
					{parsedMessage}
					{this.state.translatedMessage}
				</p>
			</div>
		);

		return messageText;
	};

	translateMessage = message => {
		const messageId = message.id;
		const messageText = message.text;


		const browserLanguageCode = Translator.getBrowserLanguage().toLowerCase();
		let translateToLanguage = browserLanguageCode;
		if (browserLanguageCode.indexOf("-") !== -1) {
			const browserLanguageArray = browserLanguageCode.split("-");
			translateToLanguage = browserLanguageArray[0];
		}

		let translatedMessage = "";
		CometChat.callExtension("message-translation", "POST", "v2/translate", {
			msgId: messageId,
			text: messageText,
			languages: [translateToLanguage],
		})
			.then(result => {
				if (result && result.hasOwnProperty("language_original") && result["language_original"] !== translateToLanguage) {
					if (result.hasOwnProperty("translations") && result.translations.length) {
						const messageTranslation = result.translations[0];
						if (messageTranslation.hasOwnProperty("message_translated")) {
							translatedMessage = `\n(${messageTranslation["message_translated"]})`;
						}
					} else {
						this.props.actionGenerated(enums.ACTIONS["ERROR"], [], "SOMETHING_WRONG");
					}
				} else {
					this.props.actionGenerated(enums.ACTIONS["INFO"], [], "SAME_LANGUAGE_MESSAGE");
				}

				this.setState({ translatedMessage: translatedMessage });
			})
			.catch(error => this.props.actionGenerated(enums.ACTIONS["ERROR"], [], "SOMETHING_WRONG"));
	};

	enableLargerSizeEmojis = () => {
		this.context.FeatureRestriction.isLargerSizeEmojisEnabled()
			.then(response => {
				if (response !== this.state.enableLargerSizeEmojis) {
					this.setState({enableLargerSizeEmojis: response});
				}
			})
			.catch(error => {
				if (this.state.enableLargerSizeEmojis !== false) {
					this.setState({enableLargerSizeEmojis: false});
				}
			});
	};

	handleMouseHover = () => {
		this.setState(this.toggleHoverState);
	};

	toggleHoverState = state => {
		return {
			isHovering: !state.isHovering,
		};
	};

	render() {
		let avatar = null,
			name = null;
		if (this.state.message.receiverType === CometChat.RECEIVER_TYPE.GROUP) {
			avatar = (
				<div css={messageThumbnailStyle()} className="message__thumbnail">
					<CometChatAvatar user={this.state.message.sender} />
				</div>
			);

			name = (
				<div css={nameWrapperStyle(avatar)} className="message__name__wrapper">
					<span css={nameStyle(this.props)} className="message__name">
						{this.state.message.sender.name}
					</span>
				</div>
			);
		}

		let messageText = this.getMessageText();
		//linkpreview extensions data
		const linkPreviewData = checkMessageForExtensionsData(this.state.message, "link-preview");
		if (linkPreviewData && linkPreviewData.hasOwnProperty("links") && linkPreviewData["links"].length) {
			messageText = <CometChatLinkPreview {...this.props} message={this.state.message} messageText={messageText} />;
		}

		//messagereactions extensions data
		let messageReactions = null;
		const reactionsData = checkMessageForExtensionsData(this.state.message, "reactions");
		if (reactionsData) {
			if (Object.keys(reactionsData).length) {
				messageReactions = (
					<div css={messageReactionsWrapperStyle()} className="message__reaction__wrapper">
						<CometChatMessageReactions {...this.props} message={this.state.message} reaction={reactionsData} />
					</div>
				);
			}
		}

		let toolTipView = null;
		if (this.state.isHovering) {
			toolTipView = <CometChatMessageActions {...this.props} message={this.state.message} name={name} translateMessage={this.translateMessage} />;
		}

		return (
			<div css={messageContainerStyle()} className="receiver__message__container message__text" onMouseEnter={this.handleMouseHover} onMouseLeave={this.handleMouseHover}>
				<div css={messageWrapperStyle()} className="message__wrapper">
					{avatar}
					<div css={messageDetailStyle()} className="message__details">
						{name}
						{toolTipView}
						<div css={messageTxtContainerStyle()} className="message__text__container">
							{messageText}
						</div>

						{messageReactions}

						<div css={messageInfoWrapperStyle()} className="message__info__wrapper">
							<CometChatReadReceipt {...this.props} message={this.state.message} />
							<CometChatThreadedMessageReplyCount {...this.props} message={this.state.message} />
						</div>
					</div>
				</div>
			</div>
		);
	}
}

// Specifies the default values for props:
CometChatReceiverTextMessageBubble.defaultProps = {
  lang: Translator.getDefaultLanguage(),
  theme: theme
};

CometChatReceiverTextMessageBubble.propTypes = {
  lang: PropTypes.string,
  theme: PropTypes.object
}

export { CometChatReceiverTextMessageBubble };