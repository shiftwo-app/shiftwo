import Alert from "../ui/Alert";

/** 操作のエラーを画面の上に出す */
const ErrorList = ({
	errors,
	className = "",
}: {
	errors: string[];
	className?: string;
}) =>
	errors.length > 0 ? (
		<Alert tone="error" className={className}>
			<ul className="space-y-0.5">
				{errors.map((message) => (
					<li key={message}>{message}</li>
				))}
			</ul>
		</Alert>
	) : null;

export default ErrorList;
