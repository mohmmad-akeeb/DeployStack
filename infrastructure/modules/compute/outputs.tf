output "asg_id" {
  description = "Auto Scaling Group ID"
  value       = aws_autoscaling_group.app.id
}

output "asg_name" {
  description = "Auto Scaling Group Name"
  value       = aws_autoscaling_group.app.name
}

output "launch_template_id" {
  description = "Launch Template ID"
  value       = aws_launch_template.app.id
}
